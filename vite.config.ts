import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import * as nodePath from 'path';
import fs from 'fs';
import { defineConfig, loadEnv, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react({
        babel: {
          plugins: [
            function({ types: t }: any) {
              return {
                visitor: {
                  Function(path: any, state: any) {
                    const filename = state.filename || '';
                    if (filename.includes('node_modules') || !filename.includes('/src/')) return;
                    if (filename.includes('tracker-global.ts')) return; // No espiar al espía

                    // Intentar deducir el nombre de la función a partir de su declaración
                    let funcName = '<anónima>';
                    if (path.node.id) {
                      funcName = path.node.id.name;
                    } else if (path.parent.type === 'VariableDeclarator' && path.parent.id) {
                      funcName = path.parent.id.name;
                    } else if (path.parent.type === 'ObjectProperty' && path.parent.key) {
                      funcName = path.parent.key.name;
                    }

                    // Inyectar rastreador de entrada y envolver en try/catch para capturar fallos
                    if (path.node.body.type === 'BlockStatement') {
                      const funcNameLiteral = t.stringLiteral(funcName);
                      const fileNameLiteral = t.stringLiteral(nodePath.basename(filename));

                      // Código a inyectar al inicio: window.__TRAZA_GLOBAL__.log(name, file, 'ENTRADA')
                      const logEntry = t.expressionStatement(
                        t.callExpression(
                          t.memberExpression(
                            t.memberExpression(t.identifier('window'), t.identifier('__TRAZA_GLOBAL__')),
                            t.identifier('log')
                          ),
                          [funcNameLiteral, fileNameLiteral, t.stringLiteral('ENTRADA')]
                        )
                      );

                      // Envolvemos el contenido original en un try { ... } catch (e) { log(e); throw e; }
                      const originalBody = path.node.body.body;
                      const catchClause = t.catchClause(
                        t.identifier('e'),
                        t.blockStatement([
                          t.expressionStatement(
                            t.callExpression(
                              t.memberExpression(
                                t.memberExpression(t.identifier('window'), t.identifier('__TRAZA_GLOBAL__')),
                                t.identifier('log')
                              ),
                              [funcNameLiteral, fileNameLiteral, t.stringLiteral('ERROR'), t.memberExpression(t.identifier('e'), t.identifier('message'))]
                            )
                          ),
                          t.throwStatement(t.identifier('e')) // Volvemos a lanzar para que React se entere
                        ])
                      );

                      path.get('body').replaceWith(
                        t.blockStatement([
                          logEntry,
                          t.tryStatement(t.blockStatement(originalBody), catchClause)
                        ])
                      );
                    }
                  }
                }
              };
            }
          ]
        }
      }), 
      tailwindcss()
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': nodePath.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
