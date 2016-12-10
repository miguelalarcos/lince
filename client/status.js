import {observable, computed} from 'mobx'

export const status = observable('disconnected')
export const ready = computed(()=>{
    if(status.get() == 'ready'){
        return true
    }
    else{
        return false
    }
})