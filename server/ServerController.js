r = require('rethinkdb')
Q = require('q')
Actor = require('../lib/Actor.js')

class Controller extends Actor{
    constructor(ws, conn){
        super()
        this.ws = ws
        this.conn = conn
        this.cursors = {}
    }
    notify(msg, done){
        console.log('notify', msg)
        msg = JSON.parse(msg)
        if(msg.type == 'subscribe'){
            this.handle_subscribe(msg.args[0], msg.args.slice(1), msg.ticket, done)
        }else if(msg.type == 'unsubscribe'){
            this.handle_unsubscribe(msg.ticket, done)
        }
        else{
            this.handle_rpc(msg.type, msg.args, msg.ticket, done)
        }
    }
    handle_rpc(command, args, ticket, done){
        console.log('rpc', command, args, ticket)
        let ret = {ticket: ticket, type: 'rpc'}
        this['rpc_' + command](...args, (val)=>{
            ret.data=val
            this.ws.send(JSON.stringify(ret))
            done()
        })
    }

    handle_unsubscribe(ticket, done){
        console.log('unsubscribe', ticket)
        //console.log(this.cursors)
        this.cursors[ticket].close()
        delete this.cursors[ticket]
        done()
    }

    handle_subscribe(predicate, args, ticket, done){
        console.log('subscribe', predicate, args, ticket)
        args = args || []
        let ret = {ticket: ticket, type: 'subscribe'}
        let pred = this['subs_' + predicate](...args)
        pred.changes({includeInitial: true, includeStates: true}).run(this.conn, (err, cursor)=>{
            this.cursors[ticket] = cursor
            cursor.each((err, data)=> {
                    if(err){
                        console.log('error at streaming', err, '---')
                    }else {
                        if (data.state) {
                            data = {type: data.state, ticket: ticket}
                            //console.log('feed', data)
                            this.ws.send(JSON.stringify(data))
                        } else {
                            let type
                            if (!data.old_val) {
                                type = 'add'
                                data.newVal = data.new_val
                                delete data.old_val
                                delete data.new_val
                            } else if (!data.new_val) {
                                type = 'delete'
                                data.id = data.old_val.id
                                delete data.old_val
                                delete data.new_val
                            } else {
                                type = 'update'
                                data.newVal = data.new_val
                                delete data.old_val
                                delete data.new_val
                            }
                            ret.type = type
                            ret.data = data
                            ret.predicate = predicate
                            //console.log('feed', ret)
                            this.ws.send(JSON.stringify(ret))
                        }
                    }
                }
            )
            done()
            // cursor.on('data', (change) => {ret.data=change; this.ws.send(JSON.stringify(ret))})
        })
    }

    rpc_add(collection, doc, callback){
        r.table(collection).insert(doc).run(this.conn).then((doc)=>callback(doc.generated_keys[0]))
    }

    _update(collection, id, doc, callback){
        r.table(collection).get(id).update(doc).run(this.conn).then((doc)=>callback(doc.replaced))
    }

    beforeUpdate(collection, doc){
        return doc
    }

    canUpdate(collection, doc, next){
        next()
    }

    rpc_update(collection, id, doc, callback){
        this.canUpdate(collection, doc, ()=>{
            doc = this.beforeUpdate(collection, doc)
            this._update(collection, id, doc, callback)
        })
    }

    rpc_delete(collection, id, callback){
        r.table(collection).get(id).delete().run(this.conn).then((doc)=>callback(doc.deleted))
    }

    get(collection, id, callback=null){
        if(callback) {
            r.table(collection).get(id).run(this.conn).then((doc) => callback(doc))
        }
        else {
            r.table(collection).get(id).run(this.conn)
        }
    }

    close(){
        for(let c of Object.values(this.cursors)){
            c.close()
        }
        console.log('close')}
}

module.exports.Controller = Controller