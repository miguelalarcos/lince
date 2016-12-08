r = require('rethinkdb')
Q = require('q')
Actor = require('../lib/Actor.js')
encodeDates = require('../lib/encodeDateServer').encodeDates
decodeDates = require('../lib/encodeDateServer').decodeDates

class Controller extends Actor{
    constructor(ws, conn){
        super()
        this.ws = ws
        this.conn = conn
        this.cursors = {}
        this.userId = null
        this.roles = ['A', 'B']
    }
    async_notify(msg, done){
        msg = JSON.parse(msg)
        msg.args = decodeDates(msg.args, msg.dates)
        if(msg.ticket > Controller.lastTicket) {
            console.log('async_notify', msg)
            if (msg.type == 'subscribe') {
                this.handle_subscribe(msg.args[0], msg.args.slice(1), msg.ticket, done)
            } else if (msg.type == 'unsubscribe') {
                this.handle_unsubscribe(msg.ticket, done)
            }
            else {
                this.handle_rpc(msg.type, msg.args, msg.ticket, done)
            }
        }else{
            done()
        }
    }
    handle_rpc(command, args, ticket, done){
        console.log('rpc', command, args, ticket)
        let ret = {ticket: ticket, type: 'rpc'}
        Q(this['rpc_' + command](...args)).then((val)=>{
            //ret.data=val
            console.log('-------------------------(a)', val)
            let {path, obj} = encodeDates(val)
            ret.dates = path
            ret.data = obj
            this.ws.send(JSON.stringify(ret))
            Controller.lastTicket = ticket
            done()
        })
    }

    handle_unsubscribe(ticket, done){
        console.log('unsubscribe', ticket)
        if(this.cursors[ticket]) {
            this.cursors[ticket].close()
            delete this.cursors[ticket]
        }
        Controller.lastTicket = ticket
        done()
    }

    handle_subscribe(predicate, args, ticket, done){
        console.log('subscribe', predicate, args, ticket)
        args = args || []
        let ret = {ticket: ticket, type: 'subscribe'}
        //let pred = this['subs_' + predicate](...args)
        Q(this['subs_' + predicate](...args)).then((pred)=> {
            pred && pred.changes({includeInitial: true, includeStates: true}).run(this.conn, (err, cursor) => {
                this.cursors[ticket] = cursor
                cursor.each((err, data) => {
                        if (err) {
                            console.log('error at streaming', err, '---')
                        } else {
                            if (data.state) {
                                data = {type: data.state, ticket: ticket, dates: []}
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
                                //ret.data = data
                                ret.predicate = predicate
                                console.log('feed')
                                //ret.dates = encodeDates(data)
                                let {path, obj} = encodeDates(data)
                                ret.dates = path
                                ret.data = obj
                                this.ws.send(JSON.stringify(ret))
                            }
                        }
                    }
                )
                Controller.lastTicket = ticket
                done()
                // cursor.on('data', (change) => {ret.data=change; this.ws.send(JSON.stringify(ret))})
            })
        })
    }

    rpc_add(collection, doc, callback){
        this.can('add', collection, doc).then((can)=>{
            if(can) {
                doc = this.beforeAdd(collection, doc)
                r.table(collection).insert(doc).run(this.conn).then((doc) => callback(doc.generated_keys[0]))
            }else{
                callback(0)
            }
        })
    }

    //_update(collection, id, doc, callback){
    //    r.table(collection).get(id).update(doc).run(this.conn).then((doc)=>callback(doc.replaced))
    //}

    hasRole(role){
        return _.includes(this.roles, role)
    }

    match(doc, pattern){
        if(pattern == {}){
            return true
        }
        let flag = false
        for(let key of Object.keys(pattern)){
            if(doc[key] != (pattern[key] || this.userId)){
                flag = false
                break
            }else{
                flag = true
            }
        }
        return flag
    }

    can(type, collection, doc){
        return Q(true)
        let can = false
        return r.table('rules').filter({type, collection}).toArray().then((results)=>{
            for(let r of results){
                if(this.match(doc, r.pattern) && !this.hasRole(r.role)){
                    can = false
                    break
                }
                else{
                    can = true
                }
            }
            return can
        })
    }

    beforeAdd(collection, doc){
        return doc
    }

    beforeUpdate(collection, doc){
        return doc
    }

    rpc_update(collection, id, doc){
        console.log('rpc update', collection, id, doc)
        let oldDoc
        return this.get(collection, id).then((old)=>{
            console.log('A')
            oldDoc = old
            return this.can('update', collection, oldDoc)
        }).then((can)=>{
            console.log('B')
            if(can) {
                let newDoc = Object.assign({}, oldDoc, doc)
                return this.can('insert', collection, newDoc)
            }else{
                return false
            }
        }).then((can)=>{
            console.log('C')
            if(can){
                doc = this.beforeUpdate(collection, doc)
                return r.table(collection).get(id).update(doc).run(this.conn).then((doc)=>{
                    console.log('doc.replaced', doc.replaced)
                    return Q(doc.replaced)
                })
            }else{
                return 0
            }
        })
    }

    rpc_delete(collection, id, callback){
        this.get(collection, id).then((oldDoc)=>{
            return this.can('delete', collection, oldDoc)
        }).then((can)=>{
            if(can){
                r.table(collection).get(id).delete().run(this.conn).then((doc)=>callback(doc.deleted))
            }else{
                callback(0)
            }
        })
    }

    rpc_login(userId, callback){
        this.userId = userId
        this.roles = ['A', 'B']
        callback(true)
    }

    get(collection, id, callback=null){
        if(callback) {
            r.table(collection).get(id).run(this.conn).then((doc) => callback(doc))
        }
        else {
            return r.table(collection).get(id).run(this.conn) // return ?
        }
    }

    close(){
        for(let c of Object.values(this.cursors)){
            c.close()
        }
        console.log('close')}
}

Controller.lastTicket = -1

module.exports.Controller = Controller