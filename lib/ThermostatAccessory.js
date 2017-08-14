//Thermostat service is used, as it most closely resembles the smartAc; in conjunction with the FanService, all properties of the smart aC could be controlled
//This code is a mixture of code found in the Device- and SensorAccessory.js files and on https://github.com/chaeplin/homebridge-mqtt-nest-thermostat/blob/master/index.js
'use strict'

var Service, Characteristic;

module.exports = function (service, characteristic) {
  Service = service;
  Characteristic = characteristic;

  return ThermostatAccessory;
};


function ThermostatAccessory(platform, accessory) {
  this.status                     = true;
  this.TargetTemperature          = 27;
  this.TargetHeatingCoolingState  = 3;
  this.CurrentHeatingCoolingState = 2;
  this.CurrentTemperature         = 0;
  this.TemperatureDisplayUnits    = 0;
  //this.FanSpeed                   = 0;

  this.platform = platform;
  this.accessory = accessory;
  this.log = platform.log;
  this.context = accessory.context;
  this.mqttPub = platform.mqttPub;
}

/*----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
**************************************************************************************************************************************************************************************
//getStaus messages
***********************************************************************************************************************************************************************************
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

ThermostatAccessory.prototype.getStatus = function(callback) {
    var self = this;

    this.log("ThermostatAccessory(" + this.context.id + ") getStatus" );
    callback(null, self.status);
};

/*----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
**************************************************************************************************************************************************************************************
//Property messages
***********************************************************************************************************************************************************************************
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/

/*--------------------------------------------------------------------------------------------------------------------------------------------------------
//getProperty messages
----------------------------------------------------------------------------------------------------------------------------------------------------------*/

ThermostatAccessory.prototype.getTargetHeatingCoolingState = function(callback) {
    var self = this; //not sure if this and next line is necessary; i think just for debugging
    this.log("ThermostatAccessory(" + this.context.id + ") getTargetHeatingCoolingState " + this.TargetHeatingCoolingState);
    callback(null, self.TargetHeatingCoolingState);
}

ThermostatAccessory.prototype.getTargetTemperature = function(callback) {
    var self = this; //not sure if this and next line is necessary
    this.log("ThermostatAccessory(" + this.context.id + ") getTargetTemperature " + this.TargetTemperature);
    callback(null, self.TargetTemperature);
}

ThermostatAccessory.prototype.getCurrentTemperature = function(callback) {
    var self = this; //not sure if this and next line is necessary
    this.log("ThermostatAccessory(" + this.context.id + ") getCurrentTemperature " + this.CurrentTemperature);
    callback(null, self.CurrentTemperature);
}

ThermostatAccessory.prototype.getTemperatureDisplayUnits = function(callback) {
    var self = this; //not sure if this and next line is necessary
    this.log("ThermostatAccessory(" + this.context.id + ") getTemperatureDisplayUnits " + this.TemperatureDisplayUnits);
    callback(null, self.TemperatureDisplayUnits);
}

ThermostatAccessory.prototype.getCurrentHeatingCoolingState = function(callback) {
    var self = this; //not sure if this and next line is necessary
    this.log("ThermostatAccessory(" + this.context.id + ") getCurrentHeatingCoolingState " + this.CurrentHeatingCoolingState);
    callback(null, self.CurrentHeatingCoolingState);
}

/*mqttnestthermostatAccessory.prototype.getFanSpeed = function(callback) {
    callback(null, this.Fanspeed);
}*/

//not sure if this is necessary
/*ThermostatAccessory.prototype.getServices = function() {
  return [this.service];
}*/

/*--------------------------------------------------------------------------------------------------------------------------------------------------------
//setProperty messages
----------------------------------------------------------------------------------------------------------------------------------------------------------*/

ThermostatAccessory.prototype.setTargetTemperature = function(TargetTemperature, callback, context) {
  this.log("ThermostatAccessory(" + this.context.id + ") setTargetTemperature:" + TargetTemperature);

    if(context !== 'fromSetValue') {
        this.TargetTemperature = TargetTemperature;
        var mqttMsg = '{"message":"set device properties","device":{"address":"' + this.context.id + '","type":"AirCondition","status":"On","properties":{"temperature":'+ this.TargetTemperature+',"mode":'+0+',"speed":'+0+',"direction":'+0+',"change":"temperature"}}}';
        /*console.log(mqttMsg);
        this.mqttClient.publish(this.pubTopic, mqttMsg, {qos:1}); //TODO replace with function call to function in index.js*/

        //call publish mqtt message from index.js
        this.mqttPub(this.platform, mqttMsg);

    }


    callback();
}


ThermostatAccessory.prototype.setTargetHeatingCoolingState = function(TargetHeatingCoolingState, callback, context) {
  this.log("ThermostatAccessory(" + this.context.id + ") setTargetHeatingCoolingState:" + TargetHeatingCoolingState );

    if(context !== 'fromSetValue') {
      this.TargetHeatingCoolingState = TargetHeatingCoolingState;
      var mqttMsg;

      switch (this.TargetHeatingCoolingState) {
        case 0:
        {
          //this.log("Success(0)");
          //turn device off
          var mqttMsg = '{"message":"set status","device":{"address":"' + this.context.id + '","status":"Off"}}';
        }
        break;
        case 1:
        {
          //this.log("Success(1)");
          if (this.status === false) {
            var StmqttMsg = '{"message":"set status","device":{"address":"' + this.context.id + '","status":"On"}}';
            //this.mqttClient.publish(this.pubTopic, StmqttMsg, {qos:1});
            this.mqttPub(this.platform, StmqttMsg);
          };

          var mqttMsg = '{"message":"set device properties","device":{"address":"' + this.context.id + '","type":"AirCondition","status":"On","properties":{"temperature":'+ 23+',"mode":'+4+',"speed":'+0+',"direction":'+0+',"change":"mode"}}}';
        }
        break;
        case 2:
        {
          //this.log("Success(2)");
          if (this.status === false) {
            var StmqttMsg = '{"message":"set status","device":{"address":"' + this.context.id + '","status":"On"}}';
            this.mqttPub(this.platform, StmqttMsg);
          };

          var mqttMsg = '{"message":"set device properties","device":{"address":"' + this.context.id + '","type":"AirCondition","status":"On","properties":{"temperature":'+ 23 +',"mode":'+1+',"speed":'+0+',"direction":'+0+',"change":"mode"}}}';
        }
        break;
        case 3:
        {
          //this.log("Success(3)");
          if (this.status === false) {
            var StmqttMsg = '{"message":"set status","device":{"address":"' + this.context.id + '","status":"On"}}';
            this.mqttPub(this.platform, StmqttMsg);
          };

          var mqttMsg = '{"message":"set device properties","device":{"address":"' + this.context.id + '","type":"AirCondition","status":"On","properties":{"temperature":'+ 23 +',"mode":'+0+',"speed":'+0+',"direction":'+0+',"change":"mode"}}}';
          //return mqttMsg;
        }
        break;
        default:
          this.log("Invalid TargetHeatingCoolingState: " + this.TargetHeatingCoolingState);

    }
    //this.log(mqttMsg);
    //this.mqttClient.publish(this.pubTopic, mqttMsg, {qos:1});
    this.mqttPub(this.platform, mqttMsg);

  };
  callback();
};

//fan speed might be implemented later
/*mqttnestthermostatAccessory.prototype.setFanSpeed = function(Fanspeed, callback, context) {
    if(context !== 'fromSetValue') {
      this.Fanspeed = Fanspeed;
      this.client.publish(this.topics.set + 'setFanSpeed', String(this.Fanspeed), this.options_publish);
      //this.client.publish(this.topic_for_esp8266, '{"ac_flow":' + String(this.Fanspeed) + '}', this.options_publish);
    }
    callback();
}*/

ThermostatAccessory.prototype.processMQTT = function(json) {
    var self = this;
    var thermostatService = this.accessory.getService(Service.Thermostat);

    this.log("ThermostatAccessory processMQTT:" + JSON.stringify(json));

    if(this.context.id == json.device.address) {
      if(json.device.status === "On")
      {
          this.status = true;
          this.log("ThermostatAccessoryStatus:" +this.status);

          this.CurrentTemperature = parseFloat(json.device.properties.temperature);
          thermostatService.setCharacteristic(Characteristic.CurrentTemperature, self.CurrentTemperature);

          this.TargetTemperature = this.CurrentTemperature //json.device.properties.temperature
          thermostatService.setCharacteristic(Characteristic.TargetTemperature, self.TargetTemperature);

          switch (parseInt(json.device.properties.mode)) {
            case 0: //wont ever occur as AC doesnt support it
            {
              this.log("SuccessTHC(Auto)");
              this.TargetHeatingCoolingState = 3
              thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, self.TargetHeatingCoolingState);
            }
            case 1:
            {
              this.log("SuccessCurrentHeatingCoolingStateUpdate(Cooling)");
              this.CurrentHeatingCoolingState = 2;
              thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, self.CurrentHeatingCoolingState);

              this.TargetHeatingCoolingState = 2
              thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, self.TargetHeatingCoolingState);
            }
            break;
            case 4 || 2 || 3:
            {
              //this.log("SuccessCurrentHeatingCoolingStateUpdate(2)");
              this.CurrentHeatingCoolingState = 1;
              thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, self.CurrentHeatingCoolingState);

              this.log("SuccessTHC(Heating)");
              this.TargetHeatingCoolingState = 1
              thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, self.TargetHeatingCoolingState);
            }
            break;
            default:
              this.log("CurrentHeatingCoolingState cannot be updated in App " + this.CurrentHeatingCoolingState);
              this.log("CurrentMode" + JSON.stringify(json.device.properties.mode));

          };
      }
      else
      {
          this.status = false;
          this.log("ThermostatAccessoryStatus:" +this.status);

          this.log("SuccessCurrentHeatingCoolingStateUpdate(Off)");
          this.CurrentHeatingCoolingState = 0;
          thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, self.CurrentHeatingCoolingState);

          this.TargetHeatingCoolingState = 0
          thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, self.TargetHeatingCoolingState);
      }

      /*
      this.CurrentTemperature = parseFloat(json.device.properties.temperature);
      thermostatService.setCharacteristic(Characteristic.CurrentTemperature, self.CurrentTemperature);

      this.TargetTemperature = this.CurrentTemperature //json.device.properties.temperature
      thermostatService.setCharacteristic(Characteristic.TargetTemperature, self.TargetTemperature); */


    /*  thermostatService.getCharacteristic(Characteristic.TargetHeatingCoolingState).setValue(self.TargetHeatingCoolingState, undefined, 'fromSetValue');
      thermostatService.getCharacteristic(Characteristic.TargetTemperature).setValue(self.TargetTemperature, undefined, 'fromSetValue');
      thermostatService.getCharacteristic(Characteristic.CurrentTemperature).setValue(self.CurrentTemperature, undefined, 'fromSetValue');
      thermostatService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).setValue(self.CurrentHeatingCoolingState, undefined, 'fromSetValue');
      //thermostatService.getCharacteristic(FanSpeedCharacteristic).setValue(that.CurrentFanSpeed, undefined, 'fromSetValue');
}
}*/

      /*this.TargetTemperature = this.CurrentTemperature //json.device.properties.temperature
      thermostatService.setCharacteristic(Characteristic.TargetTemperature, self.TargetTemperature);*/


      //TargetHeatingCoolingState
      /*if(json.device.status === "Off") {
        this.TargetHeatingCoolingState = 0
        thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, self.TargetHeatingCoolingState);
      } else if (json.device.status === "On") {
        switch (parseInt(json.device.properties.mode)) {
          case 0:
          {
            this.log("SuccessTHC(0)");
            this.CurrentHeatingCoolingState = 3
            thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, self.TargetHeatingCoolingState);
          }
          break;
          case 1:
          {
            this.log("SuccessTHC(1)");
            this.CurrentHeatingCoolingState = 2
            thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, self.TargetHeatingCoolingState);
          }
          break;
          case 2 || 3 || 4:
          {
            this.log("SuccessTHC(2)");
            this.CurrentHeatingCoolingState = 1
            thermostatService.setCharacteristic(Characteristic.TargetHeatingCoolingState, self.TargetHeatingCoolingState);
          }
          break;
          default:
            this.log("TargetHeatingCoolingState cannot be updated in App" + TargetHeatingCoolingState);

        };
      } else {
        this.log ("ErrorTargetHeatingCoolingState" + JSON.stringify(json.device.status));
      };*/


      //current HeatingCoolingState
  /*    if(json.device.status === "Off") {
        this.log("SuccessCurrentHeatingCoolingStateUpdate(0)");
        this.CurrentHeatingCoolingState = 0;
        thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, self.CurrentHeatingCoolingState);
      } else if (json.device.status === "On") {
        switch (parseInt(json.device.properties.mode)) {
          case 1:
          {
            this.log("SuccessCurrentHeatingCoolingStateUpdate(1)");
            this.CurrentHeatingCoolingState = 2;
            thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, self.CurrentHeatingCoolingState);
          }
          break;
          case 4 || 2 || 3:
          {
            this.log("SuccessCurrentHeatingCoolingStateUpdate(2)");
            this.CurrentHeatingCoolingState = 1;
            thermostatService.setCharacteristic(Characteristic.CurrentHeatingCoolingState, self.CurrentHeatingCoolingState);
          }
          break;
          default:
            this.log("CurrentHeatingCoolingState cannot be updated in App " + this.CurrentHeatingCoolingState);
            this.log("CurrentMode" + JSON.stringify(json.device.properties.mode));

        };
      }; */
    }
};





//for fan speed implementation; however possibly better to use apple own FanService
/*function makeFanSpeedCharacteristic() {

    FanSpeedCharacteristic = function() {
        Characteristic.call(this, 'FanSpeed', '00011033-0000-0000-8000-0026BB765291');
        this.setProps({
          format: Characteristic.Formats.UINT8,
          maxValue: 2,
          minValue: 0,
          minStep: 1,
          perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };

    inherits(FanSpeedCharacteristic, Characteristic);
    FanSpeedCharacteristic.LOW  = 0;
    FanSpeedCharacteristic.MID  = 1;
    FanSpeedCharacteristic.HIGH = 2;*/
