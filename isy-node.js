

class WsConnector{

    constructor(node, config) {
        this.node = node;
        this.config = config;
        this.reconnectInterval = 10*1000;
        this.connect = this.setup_connect();
    }

    close(){

    }

    setup_connect(){
        let self = this;
        let node = self.node;
        let config = self.config;
        let auth = 'Basic ' + Buffer.from(node.credentials.username + ':' + node.credentials.password).toString('base64');
        let url = `${config.ssl?'wss':'ws'}://${config.host}:${config.port}/rest/subscribe/`;

        return function(){
            self.node.log('connecting to isy');
            node.ws = new WebSocket(url,
                                   'ISYSUB',
                                   {
                                       origin: 'com.universal-devices.websockets.isy',
                                       headers: {Authorization: auth}
                                   });

            node.ws.on('message', function(message){
                node.log(message);
                parseString(message, function (err, result) {
                    if (err) {
                        node.error(err, message);
                    } else {
                        node.send({payload:result});
                    }
                });
            });

            node.ws.on('open', function() {
                node.log('socket open');
                node.status({fill:"green",shape:"dot",text:"connected"});
            });

            node.ws.on('error', function(err) {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
                node.error(err);
            });

            node.ws.on('close', function(err) {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
                node.log('connection closed, reconnecting');
                node.error(err);
                node.ws_timeout = setTimeout(self.connect, self.reconnectInterval);
            });
        };

    };

}

module.exports = function(RED) {

    const WebSocket = require('ws');
    const parseString = require('xml2js').parseString;

    function WebSocketISY(config) {
        let node = this;
        RED.nodes.createNode(node, config);

        function connect(){

        }

        node.on('opened', function(event) {
            node.status({fill:"green",shape:"dot",text: "connected"});
        });

        node.on('error', function(event) {
            node.status({fill:"red",shape:"ring",text:"error"});
        });

        node.on('closed', function(event) {
            node.status({fill:"red",shape:"ring",text:"common.status.disconnected"});
        });

        this.on('close', function(){
           clearTimeout(self.ws_timeout);
           node.ws_timeout = null;
        });
    }

    RED.nodes.registerType("isy-ws", WebSocketISY, {
        credentials: {
            username: {type:"text"},
            password: {type:"password"}
        }
    });
};
