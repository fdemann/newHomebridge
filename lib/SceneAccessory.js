'use strict';

var Accessory, Service, Characteristic;

module.exports = function (accessory, service, characteristic) {
  Accessory = accessory;
  Service = service;
  Characteristic = characteristic;

  return SceneAccessory;
};

function SceneAccessory(log, accessory, mqttClient, pubTopic) {
    this.accessory = accessory;
    this.log = log;
    this.context = accessory.context;
    this.mqttClient = mqttClient;
    this.pubTopic = pubTopic;
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
    var switchService = this.accessory.getService(Service.Switch);

    if(this.context.id == json.id)
    {
        if(json.code != 0)
        {
            console.log("scene active failed, sceneid:" + this.context.id + ", info:" + json.info);
        }
        
        switchService.getCharacteristic(Characteristic.On)
            .setValue(false, undefined, 'fromSetValue');
    }
}
