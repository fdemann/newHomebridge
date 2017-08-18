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

    if (this.accessory.reachable === true) {
    this.log("DeviceAccessory(" + this.context.id + ") getStatus" );
    callback(null, self.status);
  } else {
    callback ("no_response");
  }

  /*this.log("DeviceAccessory(" + this.context.id + ") getStatus" );
  callback(null, self.status);*/
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

    this.log("DeviceAccessory processMQTT id:" + json.device.address);
    this.log("The device is reachable: " + this.accessory.reachable);

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

        if (json.message == "device add") {
            this.accessory.updateReachability(true);
            console.log(this.accessory.reachable);
            this.log("Device was set to reachable");
        } else if (json.message == "device remove") {
            this.accessory.updateReachability(false);
            console.log(this.accessory.reachable);
            console.log("Error device is unreachable");
        }

        switchService.getCharacteristic(Characteristic.On)
            .setValue(self.status, undefined, 'fromSetValue');


    }
}
