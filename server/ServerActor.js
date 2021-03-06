EventEmitter = require('events')
express = require('express')
expressWs = require('express-ws')
path = require('path')
r = require('rethinkdb')

clients = []

class ServerActor extends EventEmitter{
    constructor(Server){
        super()
        this.ra = null
        this.app = express()
        expressWs(this.app)
        this.S = Server
        // this.index = '<body><app></app><script src="dist/lodash-bundle.js"></script><script src="dist/mobx-bundle.js"></script><script src="dist/bundle.js"></script></body>'
        this.setup()
    }

    setup(){
        this.app.use(express.static('.'))

        this.app.get('/', function(req, res, next){
            //res.send(this.index)
            //res.end()
            res.sendFile(path.join(process.cwd(), 'server', 'index.html'))
        });
    }

    setConnection(conn){
        this.emit('conn-ready', conn)
    }

    start(){
        console.log('server start')
        // this.ra.conn.observe((conn)=> {
        r.connect().then((conn)=>{
            this.setConnection(conn)
        })
        let self = this
        this.on('conn-ready', (conn)=>{
            console.log('conn ready')
            this.app.ws('/', function (ws, req) {
                console.log('client connection done')
                clients.push(ws)
                let server = new self.S(ws, conn)
                ws.on('error', (ev)=>console.log(ev))
                ws.on('message', function (msg) {
                    console.log('->', msg)
                    server.tell('async_notify', msg)
                })
                ws.on('close', ()=> {
                    console.log('close')
                    server.tell('close')
                    server = null
                })
            })
            this.app.listen(8000)
        })
    }
}

start = (CustomServer) => new ServerActor(CustomServer).start()

module.exports.start = start

