'use strict';

const EventEmitter = require('events');

class SceneAccessory extends EventEmitter {

    constructor(log, accessory, onChar, mqttClient, pubTopic)
    {
        super();
        
        this.onChar = onChar;

        this.accessory = accessory;
        this.log = log;
        this.context = accessory.context;
        this.mqttClient = mqttClient;
        this.pubTopic = pubTopic;
    }
}

SceneAccessory.prototype.getStatus = function(callback) {
    this.log("SceneAccessory(" + this.context.id + ") getStatus" );
    var status = false;
    callback(null, status);
}

SceneAccessory.prototype.setStatus = function(status, callback, context) {
    this.log("SceneAccessory(" + this.context.id + ") setStatus:" + status );
    
    if(context !== 'fromSetValue') {
        var st = status?"On":"Off";
        var mqttMsg = '{"message":"scene active","id":' + this.context.id + '}';
        this.log(mqttMsg );
        
        this.mqttClient.publish(this.pubTopic, mqttMsg, {qos:1});
    }
    
    callback();
}

SceneAccessory.prototype.processMQTT = function(json) {
    this.log("SceneAccessory processMQTT id:" + json.id );
    
    if(this.context.id == json.id)
    {
        if(json.code != 0)
        {
            console.log("scene active failed, sceneid:" + this.context.id + ", info:" + json.info);
        }
        
        this.onChar.setValue(false, undefined, 'fromSetValue');
    }
}


// Check value is a +ve integer
var is_int = function(n) {
    return (n > 0) && (n % 1 === 0);
}

var is_defined = function(v) {
    return typeof v !== 'undefined';
}

module.exports = SceneAccessory;