//host de railway
//const PROXY_HOST = 'https://pure-charisma-production-5f5b.up.railway.app';
//host local
const PROXY_HOST = 'http://localhost:8080';
const PROXY_CONFIG =[
    {
        context:['/api'],
        target: PROXY_HOST,
        secure:false,
        changeOrigin: true,
        logLevel: 'debug',
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization'
        }
    },
];

module.exports =PROXY_CONFIG;