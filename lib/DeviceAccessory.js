'use strict';

const EventEmitter = require('events');

class DeviceAccessory extends EventEmitter {

    constructor(log, accessory, onChar, mqttClient, pubTopic)
    {
        super();
        
        this.onChar = onChar;
        this.status = false;
        this.accessory = accessory;
        this.log = log;
        this.context = accessory.context;
        this.mqttClient = mqttClient;
        this.pubTopic = pubTopic;
    }
}

DeviceAccessory.prototype.getStatus = function(callback) {
    var self = this;

    this.log("DeviceAccessory(" + this.context.id + ") getStatus" );
    callback(null, self.status);
}

DeviceAccessory.prototype.setStatus = function(status, callback, context) {
    this.log("DeviceAccessory(" + this.context.id + ") setStatus:" + status );
    
    if(context !== 'fromSetValue') {
        var st = status?"On":"Off";
        var mqttMsg = '{"message":"set status","device":{"address":"' + this.context.id + '","status":"' + st + '"}}';
        //this.mqttClient("test");
        
        this.mqttClient.publish(this.pubTopic, mqttMsg, {qos:1});
    }
    callback();
}

DeviceAccessory.prototype.processMQTT = function(json) {
    var self = this;

    this.log("DeviceAccessory processMQTT id:" + json.device.address );
    
    if(this.context.id == json.device.address)
    {
        if(json.device.status === "On")
        {
            this.status = true;
        }
        else
        {
            this.status = false;
        }
        
        this.onChar.setValue(self.status, undefined, 'fromSetValue');
    }
}


// Check value is a +ve integer
var is_int = function(n) {
    return (n > 0) && (n % 1 === 0);
}

var is_defined = function(v) {
    return typeof v !== 'undefined';
}

module.exports = DeviceAccessory;