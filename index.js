'use strict';

var SceneAccessory, DeviceAccessory, SensorAccessory, ThermostatAccessory;

var Accessory, Service, Characteristic, UUIDGen;

var mqtt = require("mqtt");

const MQTTVERSION_3_1_1 = 4;
const RECON_PERIOD = 1000;
const CON_TIMEOUT = 5 * 1000;

const SCENE_OBJ_TYPE = "scene";
const DEVICE_OBJ_TYPE = "device";
const SENSOR_OBJ_TYPE = "sensor";
const THERMOSTAT_OBJ_TYPE = "thermostat"

var is_supported_type = function(v) {
    return v === SCENE_OBJ_TYPE || v === DEVICE_OBJ_TYPE || v === SENSOR_OBJ_TYPE || v === THERMOSTAT_OBJ_TYPE;
}

module.exports = function(homebridge) {
    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    SceneAccessory = require('./lib/SceneAccessory.js')(Service, Characteristic);
    DeviceAccessory = require('./lib/DeviceAccessory.js')(Service, Characteristic);
    SensorAccessory = require('./lib/SensorAccessory.js')(Service, Characteristic);
    ThermostatAccessory = require('./lib/ThermostatAccessory.js')(Service, Characteristic);

    homebridge.registerPlatform("homebridge-mqttCtrl", "mqttCtrlPlatform", mqttCtrlPlatform, false);
}

// Platform constructor
function mqttCtrlPlatform(log, config, api) {
    var platform = this;
    this.log = log;
    this.config = config;
    this.objects = this.config.objects || [];
    this.accessories = [];
    this.sceneAccessoryArray = [];
    this.deviceAccessoryArray = [];
    this.sensorAccessoryArray = [];
    this.thermostatAccessoryArray = [];

    this.mqttConected = false;
    this.mqttMsgArray = [];

    this.url = config["MQTT_url"];
    this.publish_options = {
        qos: 2
    };
    this.options = {
        keepalive: 10,
        clientId: "mqttCtrl_" + Math.random().toString(16).substr(2, 6),
        protocolId: 'MQTT',
        protocolVersion: MQTTVERSION_3_1_1,
        clean: true,
        reconnectPeriod: RECON_PERIOD,
        connectTimeout: CON_TIMEOUT,
        username: config["MQTT_usr"],
        password: config["MQTT_pwd"],
        rejectUnauthorized: false
    };
    this.topicSub    = config["gwID"]+"/response/+";
    this.topicPub    = config["gwID"]+"/request/" + this.options.clientId;

    // connect to MQTT broker
    this.client = mqtt.connect(this.url, this.options);
    var that = this;
    this.client.on('error', function () {
        that.log('Error event on MQTT');
    });

    this.client.on('connect', function () {
        that.log('MQTT connected, client id:' + that.options.clientId);
        that.client.subscribe(that.topicSub);
        that.mqttConected = true;

        if (that.mqttMsgArray.length != 0) {
          for (var i = 0; i < that.mqttMsgArray.length; i++) {
            console.log("The for loop was run " + String(i) + " times");
            var platform = this;
            var mqttMsg;
            mqttMsg = that.mqttMsgArray[i];
            that.log("mqttPub function:"+mqttMsg);

            that.client.publish(that.topicPub, mqttMsg, that.publish_options);
          }
        }
    })

    this.client.on('message', function (topic, message) {
        //that.log(topic +":[" + message.toString()+"].");

        var response = message.toString();
        if(response) {
            try {
                var jsonObj = JSON.parse(response);

                if(jsonObj.message === "scene active response")
                {
                    //that.log(topic +":[" + message.toString()+"].");

                    var sceneObjs = that.sceneAccessoryArray.filter(function(item) {
                        return item.context.id == jsonObj.id && item.context.type == SCENE_OBJ_TYPE;
                    });

                    for (var index in sceneObjs) {
                        var sceneObj = sceneObjs[index];
                        sceneObj.processMQTT(jsonObj);
                    }
                }
                else if(jsonObj.message === "status changed" )
                {
                    //that.log(topic +":[" + message.toString()+"].");

                    var devObjs = that.deviceAccessoryArray.filter(function(item) {
                        return item.context.id == jsonObj.device.address && item.context.type == DEVICE_OBJ_TYPE;
                    });

                    for (var index in devObjs) {
                        var devObj = devObjs[index];
                        devObj.processMQTT(jsonObj);
                    }

                    /* sensor */
                    var sensorObjs = that.sensorAccessoryArray.filter(function(item) {
                        return item.context.id == jsonObj.device.address && item.context.type == SENSOR_OBJ_TYPE;
                    });

                    for (var index in sensorObjs) {
                        var sensorObj = sensorObjs[index];
                        sensorObj.processMQTT(jsonObj);
                    }

                    //Thermostat/AC
                    var thermoObjs = that.thermostatAccessoryArray.filter(function(item) {
                        return item.context.id == jsonObj.device.address && item.context.type == THERMOSTAT_OBJ_TYPE;
                    });

                    for (var index in thermoObjs) {
                        var thermoObj = thermoObjs[index];
                        thermoObj.processMQTT(jsonObj);
                    }
                }
                else if(jsonObj.message === "device properties changed" )
                {
                    //that.log(topic +":[" + message.toString()+"].");

                    var sensorObjs = that.sensorAccessoryArray.filter(function(item) {
                        return item.context.id == jsonObj.device.address && item.context.type == SENSOR_OBJ_TYPE;
                    });

                    for (var index in sensorObjs) {
                        var sensorObj = sensorObjs[index];
                        sensorObj.processMQTT(jsonObj);
                    }

                    //Thermostat/AC
                    var thermoObjs = that.thermostatAccessoryArray.filter(function(item) {
                        return item.context.id == jsonObj.device.address && item.context.type == THERMOSTAT_OBJ_TYPE;
                    });

                    for (var index in thermoObjs) {
                        var thermoObj = thermoObjs[index];
                        thermoObj.processMQTT(jsonObj);
                    }
                }
            } catch(e) {
                that.log("invalid json string: " + String(e));
                return;
            }
        }
    });

    if (api) {
        // Save the API object as plugin needs to register new accessory via this object.
        this.api = api;
        platform.log("homebridge API version: " + api.version);

        // Listen to event "didFinishLaunching", this means homebridge already finished loading cached accessories
        // Platform Plugin should only register new accessory that doesn't exist in homebridge after this event.
        // Or start discover new accessories
        this.api.on('didFinishLaunching', function() {
            platform.log("Loading cached accessory complete");

            for ( var i in this.objects ) {
                this.addObject(this.objects[i]);
            }
        }.bind(this));
    }
}

// Sample function to show how developer can add accessory dynamically from outside event
mqttCtrlPlatform.prototype.addObject = function(object) {
    var platform = this;
    var uuid;

    platform.log("object type:" +object.type+", name:"+object.name+", id:"+object.id);

    if(!is_supported_type(object.type))
    {
        return;
    }

    uuid = UUIDGen.generate(object.id);

    var uuidExists = this.accessories.filter(function(item) {
        return item.UUID == uuid;
    }).length;

    if (uuidExists == 0)
    {
        platform.log("New object from config.json: " + object.name + " (" + object.id + ")");

        var newAccessory = new Accessory(object.name, uuid);

        newAccessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Manufacturer, platform.config.manufacturer ? platform.config.manufacturer : "CT DD DS SZ")
            .setCharacteristic(Characteristic.Model, platform.config.model ? platform.config.model : "Gateway")
            .setCharacteristic(Characteristic.SerialNumber, platform.config.serial ? platform.config.serial : "12-345-ABCD");

        newAccessory.context = object;

        this.configureAccessory(newAccessory);

        this.api.registerPlatformAccessories("homebridge-mqttCtrlPlatform", "mqttCtrlPlatform", [newAccessory]);
    }
}


// Function invoked when homebridge tries to restore cached accessory
mqttCtrlPlatform.prototype.configureAccessory = function(accessory) {
    //this.log(accessory.displayName, "Configure Accessory", accessory.UUID);
    var platform = this;
    var object = accessory.context;

    if(platform.config.overrideCache === "true") {
        var newContext = platform.objects.find( p => p.name === accessory.context.name );
        accessory.context = newContext;
    }

    switch(object.type)
    {
        case SCENE_OBJ_TYPE:
            {
                if(!accessory.getService(Service.Switch))
                {
                    accessory.addService(Service.Switch, object.name);
                }

                var sceneAccessory = new SceneAccessory(platform, accessory);
                platform.sceneAccessoryArray.push(sceneAccessory);

                accessory.getService(Service.Switch)
                  .getCharacteristic(Characteristic.On)
                  .on('get', sceneAccessory.getStatus.bind(sceneAccessory))
                  .on('set', sceneAccessory.setStatus.bind(sceneAccessory));
            }
            break;
        case DEVICE_OBJ_TYPE:
            {
                if(!accessory.getService(Service.Switch))
                {
                    accessory.addService(Service.Switch, object.name);
                }

                var deviceAccessory = new DeviceAccessory(platform, accessory);
                platform.deviceAccessoryArray.push(deviceAccessory);

                accessory.getService(Service.Switch)
                  .getCharacteristic(Characteristic.On)
                  .on('get', deviceAccessory.getStatus.bind(deviceAccessory))
                  .on('set', deviceAccessory.setStatus.bind(deviceAccessory));

                var reqStatusMsg = '{"message":"request status","device":{"address":"' + object.id + '"}}';
                this.mqttPub(this, reqStatusMsg);
            }
            break;
        case SENSOR_OBJ_TYPE:
            {
                if(!accessory.getService(Service.TemperatureSensor))
                {
                    accessory.addService(Service.TemperatureSensor, object.name+"-Temp");
                }

                if(!accessory.getService(Service.HumiditySensor))
                {
                    accessory.addService(Service.HumiditySensor, object.name+"-Humidity");
                }

                if(!accessory.getService(Service.AirQualitySensor))
                {
                    accessory.addService(Service.AirQualitySensor, object.name+"-AirQuality");
                }

                if(!accessory.getService(Service.BatteryService))
                {
                    accessory.addService(Service.BatteryService, object.name+"-Battery");
                }

                var sensorAccessory = new SensorAccessory(platform, accessory);
                platform.sensorAccessoryArray.push(sensorAccessory);

                accessory.getService(Service.TemperatureSensor)
                  .getCharacteristic(Characteristic.CurrentTemperature)
                  .setProps({ minValue: -20, maxValue: 60 })
                  .on('get', sensorAccessory.getTemp.bind(sensorAccessory));

                accessory.getService(Service.HumiditySensor)
                  .getCharacteristic(Characteristic.CurrentRelativeHumidity)
                  .setProps({ minValue: 0, maxValue: 100 })
                  .on('get', sensorAccessory.getHumidity.bind(sensorAccessory));

                accessory.getService(Service.AirQualitySensor)
                  .getCharacteristic(Characteristic.AirQuality)
                  .on('get', sensorAccessory.getAirQuality.bind(sensorAccessory));

                if(accessory.getService(Service.AirQualitySensor)
                  .getCharacteristic(Characteristic.PM2_5Density))
                {
                    accessory.getService(Service.AirQualitySensor)
                        .getCharacteristic(Characteristic.PM2_5Density)
                        .on('get', sensorAccessory.getPM2_5.bind(sensorAccessory));
                }
                else
                {
                    accessory.getService(Service.AirQualitySensor)
                        .addCharacteristic(Characteristic.PM2_5Density)
                        .on('get', sensorAccessory.getPM2_5.bind(sensorAccessory));
                }

                accessory.getService(Service.BatteryService)
                  .getCharacteristic(Characteristic.BatteryLevel)
                  .on('get', sensorAccessory.getBatteryLevel.bind(sensorAccessory));

                accessory.getService(Service.BatteryService)
                  .getCharacteristic(Characteristic.ChargingState)
                  .on('get', sensorAccessory.getChargingState.bind(sensorAccessory));

                accessory.getService(Service.BatteryService)
                  .getCharacteristic(Characteristic.StatusLowBattery)
                  .on('get', sensorAccessory.getStatusLowBattery.bind(sensorAccessory));

                var reqStatusMsg = '{"message":"request status","device":{"address":"' + object.id + '"}}';
                this.mqttPub(this, reqStatusMsg);
            }
            break;
            case THERMOSTAT_OBJ_TYPE: //TODO update
              {
                if(!accessory.getService(Service.Thermostat))
                {
                  accessory.addService(Service.Thermostat, object.name);
                }

                var thermostatAccessory = new ThermostatAccessory(platform, accessory); //Service, Characteristic);
                platform.thermostatAccessoryArray.push(thermostatAccessory);



                accessory.getService(Service.Thermostat)
                  .getCharacteristic(Characteristic.TargetTemperature)
                  .setProps({
                    maxValue: 31,
                    minValue: 16,
                    minStep: 1
                    })
                  //.on('set', this.setTargetTemperature.bind(thermostatAccessory))
                  .on('get', thermostatAccessory.getTargetTemperature.bind(thermostatAccessory))
                  .on('set', thermostatAccessory.setTargetTemperature.bind(thermostatAccessory));

                accessory.getService(Service.Thermostat)
                  .getCharacteristic(Characteristic.TargetHeatingCoolingState)
                  //.on('set', this.setTargetHeatingCoolingState.bind(thermostatAccessory))
                  .on('get', thermostatAccessory.getTargetHeatingCoolingState.bind(thermostatAccessory))
                  .on('set', thermostatAccessory.setTargetHeatingCoolingState.bind(thermostatAccessory));

                accessory.getService(Service.Thermostat)
                  .getCharacteristic(Characteristic.CurrentTemperature)
                  .setProps({
                    maxValue: 100,
                    minValue: 0,
                    minStep: 0.01
                    })
                  .on('get', thermostatAccessory.getCurrentTemperature.bind(thermostatAccessory));

                accessory.getService(Service.Thermostat)
                  .getCharacteristic(Characteristic.TemperatureDisplayUnits)
                  .on('get', thermostatAccessory.getTemperatureDisplayUnits.bind(thermostatAccessory));

                accessory.getService(Service.Thermostat)
                  .getCharacteristic(Characteristic.CurrentHeatingCoolingState)
                  .on('get', thermostatAccessory.getCurrentHeatingCoolingState.bind(thermostatAccessory));

              var reqStatusMsg = '{"message":"request status","device":{"address":"' + object.id + '"}}';
              this.mqttPub(this, reqStatusMsg);

            }
            break;
        default:
            platform.log("unknown object type:" + object.type);
            return;
    }

    // set the accessory to reachable if plugin can currently process the accessory
    // otherwise set to false and update the reachability later by invoking
    // accessory.updateReachability()
    accessory.reachable = true;

    // Handle the 'identify' event
    accessory.on('identify', function(paired, callback) {
        platform.log(accessory.displayName, "Identify!!!");
        // TODO: run 3000ms on/off?
        callback();
    });

    this.accessories.push(accessory);
}

//Handler will be invoked when user try to config your plugin
//Callback can be cached and invoke when necessary
mqttCtrlPlatform.prototype.configurationRequestHandler = function(context, request, callback) {
    console.log("Not Implemented");
}

mqttCtrlPlatform.prototype.updateAccessoriesReachability = function() {
    this.log("Update Reachability");
    for (var index in this.accessories) {
        var accessory = this.accessories[index];
        accessory.updateReachability(false);
    }
}

// Sample function to show how developer can remove accessory dynamically from outside event
mqttCtrlPlatform.prototype.removeAccessory = function(accessory) {
    this.log("Remove Accessory");
    this.api.unregisterPlatformAccessories("homebridge-mqttCtrlPlatform", "mqttCtrlPlatform", this.accessories);

    this.accessories = [];
}

/*mqttCtrlPlatform.prototype.mqttPub = function(platform, message) {
    this.log("mqttPub function:"+message);

    platform.client.publish(platform.topicPub, message, platform.publish_options);
}*/


mqttCtrlPlatform.prototype.mqttPub = function(platform, message) {
  if (platform.mqttConected === false) {
    console.log("mqttMsg buffered");
    platform.mqttMsgArray.push(message);
  } else {
    console.log("the else statement was run");
    //var that = this
    //var platform = this;
    this.log("mqttPub function:"+message);

    platform.client.publish(platform.topicPub, message, platform.publish_options);
  }
};
