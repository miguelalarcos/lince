import {observable, autorun} from 'mobx'

export const i18nMixin = (self) => {
    return {
        language: observable('es'),
        i18nResource: {},
        i18nInit: () => autorun(()=>self.dispatcher.ask('rpc', 'getLanguage', self.language.get()).then((resource)=> {
            console.log('tag autorun de language', resource)
            self.i18nResource = resource
            self.update()
        })),
        t: (tag)=> {
            return self.i18nResource[tag] || tag
        }
    }
}