'use strict';

const SceneAccessory = require('./lib/SceneAccessory.js');
const DeviceAccessory = require('./lib/DeviceAccessory.js');

var Accessory, Service, Characteristic, UUIDGen;

var mqtt = require("mqtt");

const MQTTVERSION_3_1_1 = 4;
const RECON_PERIOD = 1000;
const CON_TIMEOUT = 5 * 1000;

const SCENE_OBJ_TYPE = "scene";
const DEVICE_OBJ_TYPE = "device";

var is_supported_type = function(v) {
    return v === SCENE_OBJ_TYPE || v === DEVICE_OBJ_TYPE;
}

module.exports = function(homebridge) {
    // Accessory must be created from PlatformAccessory Constructor
    Accessory = homebridge.platformAccessory;

    // Service and Characteristic are from hap-nodejs
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

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

    this.url = config["MQTT_url"];
    this.publish_options = {
        qos: 1
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
                }
            } catch(e) {
                that.log("invalid json string: " + response);
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
            .setCharacteristic(Characteristic.Manufacturer, platform.config.manufacturer ? platform.config.manufacturer : "Raspberry Pi Foundation")
            .setCharacteristic(Characteristic.Model, platform.config.model ? platform.config.model : "MQTT Ctrl")
            .setCharacteristic(Characteristic.SerialNumber, platform.config.serial ? platform.config.serial : "Default-SerialNumber");

        newAccessory.addService(Service.Switch, object.name);

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
 
    var onChar;
    if (accessory.getService(Service.Switch)) { 
        onChar = accessory.getService(Service.Switch).getCharacteristic(Characteristic.On);
    }

    switch(object.type)
    {
        case SCENE_OBJ_TYPE:
            {  
                var sceneAccessory = new SceneAccessory(platform.log, accessory, onChar, platform.client, platform.topicPub);
                platform.sceneAccessoryArray.push(sceneAccessory);

                if (accessory.getService(Service.Switch)) {
                    accessory.getService(Service.Switch)
                      .getCharacteristic(Characteristic.On)
                      .on('get', sceneAccessory.getStatus.bind(sceneAccessory))
                      .on('set', sceneAccessory.setStatus.bind(sceneAccessory));
                }
            }
            break;
        case DEVICE_OBJ_TYPE:
            {  
                var deviceAccessory = new DeviceAccessory(platform.log, accessory, onChar, platform.client, platform.topicPub);
                platform.deviceAccessoryArray.push(deviceAccessory);

                if (accessory.getService(Service.Switch)) {
                    accessory.getService(Service.Switch)
                      .getCharacteristic(Characteristic.On)
                      .on('get', deviceAccessory.getStatus.bind(deviceAccessory))
                      .on('set', deviceAccessory.setStatus.bind(deviceAccessory));
                }
                
                var reqStatusMsg = '{"message":"request status","device":{"address":"' + object.id + '"}}';
                this.mqttPub(reqStatusMsg);
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

mqttCtrlPlatform.prototype.mqttPub = function(message) {
    var platform = this;
    //this.log("mqttPub function");

    platform.client.publish(platform.topicPub, message, platform.publish_options);
}

