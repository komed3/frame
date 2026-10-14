import chalk from 'chalk';


export const ui = {
  success: ( text: string ) => console.log( `${ chalk.green( '[OK]' ) } ${ text }` ),
  info: ( text: string ) => console.log( text ),
  warning: ( text: string ) => console.log( `${ chalk.yellow( '[WARN]' ) } ${ text }` ),
  error: ( text: string ) => console.error( `${ chalk.red( '[ERR]' ) } ${ text }` ),

  key: ( text: string ) => chalk.bold( text ),
  value: ( text: string ) => chalk.cyan( text ),

  confirm: ( text: string ) => `${ text } ${ chalk.gray( '[y/N] ' ) }`,
  muted: ( text: string ) => chalk.gray( text ),
  cancelled: () => console.log( chalk.yellow( 'Cancelled.' ) )
};
