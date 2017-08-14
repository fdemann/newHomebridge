'use strict';

var Service, Characteristic;

module.exports = function (service, characteristic) {
  Service = service;
  Characteristic = characteristic;

  return DeviceAccessory;
};

function DeviceAccessory(platform, accessory) {
    this.status = false;
    this.platform = platform;
    this.accessory = accessory;
    this.log = platform.log;
    this.context = accessory.context;
    this.mqttPub = platform.mqttPub;
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

        this.mqttPub(this.platform, mqttMsg);
    }
    callback();
}

DeviceAccessory.prototype.processMQTT = function(json) {
    var self = this;
    var switchService = this.accessory.getService(Service.Switch);

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
        
        switchService.getCharacteristic(Characteristic.On)
            .setValue(self.status, undefined, 'fromSetValue');
    }
}
