import {ws} from '../client/webSocketActor'
import {store} from '../client/collectionStoreActor'
import {ui} from '../client/uiActor.js'
import {dispatcher} from '../client/dispatcherActor.js'
import {offline} from '../client/offlineActor'

ws.store = store
ws.dispatcher = dispatcher
ui.dispatcher = dispatcher
ui.store = store
dispatcher.ws = ws
dispatcher.store = store
store.ws = ws
ws.offline = offline
offline.ws = ws

ws.start()

import simple from 'simple-mock'
import chai from 'chai'
let expect = chai.expect

offline.ws = ws

store.register('todos', 'todos')

let todos_filter = (filter) => {
    return (item) => {
        if(filter == 'ALL'){
            return true
        }else{
            return filter == 'DONE'? item.done: !item.done
        }
    }
}
offline.register('todos', todos_filter)

describe('test offline', function() {
    it('should call tell', function() {
        simple.mock(ws, 'tell')
        offline.subscribe('0', ['todos', 'ALL'])
        offline.handle({id: '0', desc: 'hacer x', done: false}, 'todos')
        let ret = ["dispatch", {
                    data: {
                        newVal: {
                            id: '0',
                            desc: 'hacer x',
                            done: false
                        }
                    },
                    predicate: "todos",
                    ticket: 0,
                    type: "add"
                    }
                ]

        expect(ws.tell.lastCall.args).to.eql(ret)
    })

    it('should not call tell', function() {
        simple.mock(ws, 'tell')
        offline.subscribe('0', ['todos', 'DONE'])
        offline.handle({id: '0', desc: 'hacer x', done: false}, 'todos')

        expect(ws.tell.lastCall.args).to.eql([])
    })

    it('test update in and out', ()=>{
        simple.mock(ws, 'tell')
        offline.clear()
        offline.subscribe(0, ['todos', 'DONE'])
        offline.subscribe(1, ['todos', 'PENDING'])

        offline.send({type: 'add', ticket: 2, args: ['todos', {desc: 'hacer x', done: false}]})
        expect(ws.tell.calls[0].args).to.eql(["dispatch", {
            "data": 1,
            "ticket": 2,
            "type": "rpc"
          }]
        )
        expect(ws.tell.calls[1].args).to.eql(["dispatch",
                  {
                    data: {
                        newVal: {
                            desc: "hacer x",
                            done: false,
                            id: ":2"
                        }
                    },
                    predicate: "todos",
                    ticket: 1,
                    type: "add"
                  }
                  ])
        offline.send({type: 'update', ticket: 3, args: ['todos', ":2", {done: true}]})
        expect(ws.tell.calls[2].args).to.eql(["dispatch", {
                "data": 1,
                "ticket": 3,
                "type": "rpc"
            }]
        )

        expect(ws.tell.calls[3].args).to.eql(["dispatch",
            {
                data: {
                    newVal: {
                        desc: "hacer x",
                        done: true,
                        id: ":2"
                    }
                },
                predicate: "todos",
                ticket: 0,
                type: "add"
            }
        ])

        expect(ws.tell.calls[4].args).to.eql(["dispatch",
            {
                data: {
                    newVal: {
                        desc: "hacer x",
                        done: true,
                        id: ":2"
                    }
                },
                predicate: "todos",
                ticket: 1,
                type: "delete"
            }
        ])

    })

})




