import chalk from 'chalk';


export const ui = {
  success: ( text: string ) => console.log( chalk.green( text ) ),
  info: ( text: string ) => console.log( text ),
  warning: ( text: string ) => console.log( chalk.yellow( `[WARN] ${ text }` ) ),
  error: ( text: string ) => console.error( chalk.red( `[ERR] ${ text }` ) ),
  muted: ( text: string ) => chalk.gray( text ),
  key: ( text: string ) => chalk.bold( text ),
  value: ( text: string ) => chalk.cyan( text ),
  status: ( active: boolean ) => active ? chalk.green( 'active' ) : chalk.red( 'disabled' ),
  confirm: ( text: string ) => `${ text } ${ chalk.gray( '[y/N] ' ) }`
};
