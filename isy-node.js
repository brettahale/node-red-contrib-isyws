module.exports = function(RED) {

    const WebSocket = require('ws');
    const parseString = require('xml2js').parseString;

    function WebSocketISY(config) {
        let node = this;
        RED.nodes.createNode(node, config);
        node.log('New WebSocketISY');
        let auth = 'Basic ' + Buffer.from(node.credentials.username + ':' + node.credentials.password).toString('base64');
        let url = `${config.ssl?'wss':'ws'}://${config.host}:${config.port}/rest/subscribe/`;
        let reconnectInterval = 10*1000;

        function connect(){
            node.log(`connecting to isy: ${url}`);
            node.ws = new WebSocket(url,
                                    'ISYSUB',
                                    {
                                        origin: 'com.universal-devices.websockets.isy',
                                        headers: {Authorization: auth}
                                    });

            node.ws.on('error', function(err) {
                node.status({fill:"red",shape:"ring",text:"disconnected"});
                node.error(`Socket Error: ${err}`);
            });

            node.ws.on('message', function(message){
                parseString(message, function (err, result) {
                    if (err) {
                        node.error(err, message);
                    } else if (result.SubscriptionResponse) {
                        node.log('subscribed');
                    } else {
                        node.log(JSON.stringify(result));

                        isyEvent = {
                            control: result.Event.control[0],
                            action: result.Event.action[0],
                            eventMeta: result.Event.eventInfo[0],
                            rawEvent: result
                        };
                        node.send({payload:isyEvent});
                    }
                });
            });

            node.ws.on('open', function() {
                node.log('socket open');
                node.status({fill:"green",shape:"dot",text:"connected"});
            });

            node.ws.on('close', function(err) {
                node.error(`Socket Closed: ${err}`);
                node.log('reconnecting...');
                node.ws_timeout = setTimeout(connect, reconnectInterval);
            });
        }

        node.on('close', function(){
            node.log('node close');
            node.status({fill:"red",shape:"ring",text:"common.status.disconnected"});
            node.ws.terminate();
            clearTimeout(node.ws_timeout);
            node.ws_timeout = null;
        });

        connect();
    }

    RED.nodes.registerType("isy-ws", WebSocketISY, {
        credentials: {
            username: {type:"text"},
            password: {type:"password"}
        }
    });
};
