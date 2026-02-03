function Util() {
    return {
        sleep: (second) => {
            return new Promise(resolve => setTimeout(resolve, second * 1000));
        }
    }
}

module.exports = Util();