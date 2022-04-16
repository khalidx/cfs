export function start (module: NodeModule) {
  if (require.main === module) {
    console.log(process.argv)
  }  
}
