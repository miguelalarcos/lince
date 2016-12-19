import simple from 'simple-mock'
import chai from 'chai'
let expect = chai.expect
import {Controller} from '../server/ServerController'
import Q from 'q'

let c = new Controller(null, null)

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

})