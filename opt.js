let data = '1234567890abcdefghijklmnopqrstuvwxyz'

let idx;
let length = 6;
let res = [];


for (let i = 0; i < length; i++) {

    idx = Math.floor(Math.random(i) * data.length) 
    res.push(data[idx]);

}

console.log(res.join(" "));
