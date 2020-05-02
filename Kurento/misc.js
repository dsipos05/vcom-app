    
    /* Take one argument and turn it into a string */
    function ensureString(arg){
        let str;
        switch(typeof arg){
            case "object":
                try{
                    str = JSON.stringify(arg);
                }catch(e){
                    str = "[object Object(couldn't be stringified)]"
                }
                break;
            case "string":
                str = arg;
            case "boolean":
            case "number":
            case "undefined":
            case "function":
            case "bigint":
                str = arg+"";
                break;
            default: // only remaining type is 'symbol'
                str = arg+"";
        }
        return str;
    }
    /* Takes in any number of arguments of any type and converts them each to a string
    then returns the result of them all concatenated.
    This is useful if you aren't sure the types of your variables but still want to print them.
    For instance, if you don't know if an error in a callback will be a string or an object with a string member
    this way you can just throw in the error variable and whatever type it is it will be part of the string. */
    function stringify(){
        let args = Array.from(arguments);
        let strings = args.map(ensureString);
        return strings.join(",");
    }

    module.exports = {
        stringify,
        ensureString
    }