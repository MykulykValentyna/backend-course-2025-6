const { program } = require('commander');
const http = require('http');
program
  .requiredOption('-h, --host <host>', 'Host')
  .requiredOption('-p, --port <port>', 'Port')
  .requiredOption('-c, --cache <cache>', 'Cache dir')
  .parse();
const opts = program.opts();
if (!fs.existsSync(opts.cache)) fs.mkdirSync(opts.cache, { recursive: true });

server.listen(opts.port, opts.host, () => {
  console.log(`Server: http://${opts.host}:${opts.port}`);
});