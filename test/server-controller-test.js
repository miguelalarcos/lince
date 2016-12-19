import simple from 'simple-mock'
import chai from 'chai'
let expect = chai.expect
import {Controller} from '../server/ServerController'
import Q from 'q'

let c = new Controller(null, null)
c.ws = {}

describe('test server controller', () => {
    it('test empty can false', (done)=>{
        simple.mock(c, 'getRules').returnWith(Q([{pattern: {}, role: 'C'}]))
        c.roles = ['A', 'B']
        c.can(null, null, {a: 1}).then((can) => {
            expect(can).to.be.false
            done()
        })
    })

    it('test empty can true', (done)=>{
        simple.mock(c, 'getRules').returnWith(Q([{pattern: {}, role: 'C'}]))
        c.roles = ['C']
        c.can(null, null, {a: 1}).then((can) => {
            expect(can).to.be.true
            done()
        })
    })

    it('test can false', (done)=>{
        simple.mock(c, 'getRules').returnWith(Q([{pattern: {a: 1}, role: 'C'}]))
        c.roles = ['A']
        c.can(null, null, {a: 1}).then((can) => {
            expect(can).to.be.false
            done()
        })
    })

    it('test can true', (done)=>{
        simple.mock(c, 'getRules').returnWith(Q([{pattern: {a: 1}, role: 'C'}]))
        c.roles = ['C']
        c.can(null, null, {a: 1}).then((can) => {
            expect(can).to.be.true
            done()
        })
    })

    it('test match empty', () =>{
        expect(c.match({a:1}, {})).to.be.true
    })

    it('test match equal', () =>{
        expect(c.match({a:1}, {a:1})).to.be.true
    })

    it('test match sub', () =>{
        expect(c.match({a:1, b:1}, {a:1})).to.be.true
    })

    it('test not match', () =>{
        expect(c.match({a:1}, {b:1})).to.be.false
    })

    it('test match multiple', () =>{
        expect(c.match({a:1, b:1, c:1}, {a:1, b:1})).to.be.true
    })

    it('test add called', (done)=>{
        simple.mock(c, 'getRules').returnWith(Q([{pattern: {a: 1}, role: 'C'}]))
        simple.mock(c, 'add').returnWith(Q({generated_keys: ['1']}))
        simple.mock(c.ws, 'send')
        c.roles = ['C']
        c.handle_rpc('add', ['todos', {a:1, b:2}], 1, ()=>{}).then(()=>{
            expect(c.add.called).to.be.true
            done()
        })
    })

    it('test add not called', (done)=>{
        simple.mock(c, 'getRules').returnWith(Q([{pattern: {a: 1}, role: 'C'}]))
        simple.mock(c, 'add').returnWith(Q({generated_keys: ['1']}))
        simple.mock(c.ws, 'send')
        c.roles = ['A']
        c.handle_rpc('add', ['todos', {a:1, b:2}], 1, ()=>{}).then(()=>{
            expect(c.add.called).to.be.false
            done()
        })
    })

    it('test update called', (done)=>{
        simple.mock(c, 'getRules').returnWith(Q([{pattern: {a: 1}, role: 'C'}]))
        simple.mock(c, 'update').returnWith(Q({replaced: 1}))
        simple.mock(c, 'get').returnWith(Q({a:1, b:1}))
        simple.mock(c.ws, 'send')
        c.roles = ['C']
        c.handle_rpc('update', ['todos', '0', {a:1, b:2}], 1, ()=>{}).then(()=>{
            expect(c.update.called).to.be.true
            done()
        })
    })

    it('test update not called', (done)=>{
        simple.mock(c, 'getRules').returnWith(Q([{pattern: {a: 1}, role: 'C'}]))
        simple.mock(c, 'update').returnWith(Q({replaced: 1}))
        simple.mock(c, 'get').returnWith(Q({a:1, b:1}))
        simple.mock(c.ws, 'send')
        c.roles = ['A']
        c.handle_rpc('update', ['todos', '0', {a:1, b:2}], 1, ()=>{}).then(()=>{
            expect(c.update.called).to.be.false
            done()
        })
    })

})