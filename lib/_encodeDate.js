module.exports._encodeDates = (_, moment) => (arg) => {
    const encodeObject = (ret, path, obj) => {
        let keys = Object.keys(obj)
        for(let key of keys){
            if(_.isDate(obj[key])){
                ret.push((path+'.'+key).substring(1))
                obj[key] = moment(obj[key]).unix()
            }else if(_.isObject(obj[key])){
                encodeObject(ret, path+'.'+key, obj[key])
            }else{

            }
        }
    }

    let ret = []

    if(_.isDate(arg)){
        return {path: true, obj: moment(arg).unix()}
    }else if(_.isObject(arg)){
        encodeObject(ret, '', arg)
    }else{
        return {path: false, obj: arg}
    }

    return {path: ret, obj: arg}
}


module.exports._decodeDates = (_, moment) => (arg, paths) => {
    const decodeObject = (arg, path) => {
        let base, p
        for(p of path.split('.')){
            base = arg
            arg = arg[p]
        }
        base[p] = moment.unix(arg).toDate()
    }

    if(paths == true){
        return moment.unix(arg).toDate()
    }else if(paths == false){
        return arg
    }else{
        for(let path of paths){
            decodeObject(arg, path)
        }
        return arg
    }
}
