EventEmitter = require('events')
express = require('express')
expressWs = require('express-ws')

clients = []

class ServerActor extends EventEmitter{
    constructor(Server){
        super()
        this.ra = null
        this.app = express()
        expressWs(this.app)
        this.S = Server
        this.index = '<body><app></app><script src="dist/lodash-bundle.js"></script><script src="dist/mobx-bundle.js"></script><script src="dist/bundle.js"></script></body>'
        this.setup()
    }

    setup(){
        this.app.use(express.static('.'))

        this.app.get('/', function(req, res, next){
            res.send(this.index)
            res.end()
        });
    }

    setConnection(conn){
        this.emit('conn-ready', conn)
    }

    start(){
        // this.ra.conn.observe((conn)=> {
        let self = this
        this.on('conn-ready', (conn)=>{
            this.app.ws('/', function (ws, req) {
                clients.push(ws)
                let server = new self.S(ws, conn)
                ws.on('error', (ev)=>console.log(ev))
                ws.on('message', function (msg) {
                    server.notify(msg)
                })
                ws.on('close', ()=> {
                    server.close()
                    server = null
                })
            })
            this.app.listen(8000)
        })
    }
}

module.exports.ServerActor = ServerActor
