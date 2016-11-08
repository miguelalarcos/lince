class Controller{
    constructor(ws, conn){
        this.ws = ws
        this.conn = conn
        this.cursors = {}
    }
    notify(msg){
        console.log(msg)
        msg = JSON.parse(msg)
        if(msg.type == 'subscribe'){
            this.handle_subscribe(msg.predicate, msg.args, msg.ticket)
        }else if(msg.type == 'unsubscribe'){
            this.handle_unsubscribe(msg.ticket)
        }
        else{
            this.handle_rpc(msg.type, msg.args, msg.ticket)
        }
    }
    handle_rpc(command, args, ticket){
        console.log('rpc', command, args, ticket)
        let ret = {ticket: ticket, type: 'rpc'}
        this['rpc_' + command](...args, (val)=>{
            ret.data=val
            this.ws.send(JSON.stringify(ret))
        })
    }

    handle_unsubscribe(ticket){
        this.cursors[ticket].close()
        delete this.cursors[ticket]
    }

    handle_subscribe(predicate, args, ticket){
        console.log('subscribe', predicate, args, ticket)
        args = args || []
        let ret = {ticket: ticket, type: 'subscribe'}
        let pred = this['subs_' + predicate](...args)
        pred.changes({includeInitial: true, includeStates: true}).run(this.conn, (err, cursor)=>{
            this.cursors[ticket] = cursor
            cursor.each((err, data)=> {
                    if (data.state) {
                        data = {type: data.state, ticket: ticket}
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
                        this.ws.send(JSON.stringify(ret))
                    }
                }
            )
            // cursor.on('data', (change) => {ret.data=change; this.ws.send(JSON.stringify(ret))})
        })
    }

    rpc_add(collection, doc, callback){
        r.table(collection).insert(doc).run(this.conn).then((doc)=>callback(doc.generated_keys[0]))
    }

    rpc_update(collection, id, doc, callback){
        r.table(collection).get(id).update(doc).run(this.conn).then((doc)=>callback(doc.replaced))
    }

    rpc_delete(collection, id, callback){
        r.table(collection).get(id).delete().run(this.conn).then((doc)=>callback(doc.deleted))
    }

    close(){
        for(let c of Object.values(this.cursors)){
            c.close()
        }
        console.log('close')}
}

module.exports.Controller = Controller