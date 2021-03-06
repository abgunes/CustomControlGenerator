sap.ui.define([
	"sap/ui/base/Object",
	"htmltocontrolconverterplugin/utils/PropertyGenerator"
], function (Object, Property) {
	"use strict";
	return Object.extend("htmltocontrolconverterplugin.utils.ControlGenerator", {
		constructor: function (json) {
			this.setJSON(json);
		},
		setJSON: function (json) {
			this._json = json;
		},
		getJSON: function () {
			return this._json;
		},
		getAllProperties: function () {
			this.generateRendererFn();
			return this.props;
		},
		setMappingTable: function (aMappings) {
			this._aMappings = aMappings;
		},
		generateControl: function (json, name, skipRenderer) {
			if (json) {
				this.setJSON(json);
			}
			if (!this.getJSON()) {
				console.log("No JSON available!");
				return;
			}
			// must be first --> will search for properties
			var renderer = this.generateRendererFn();

			var controlStr = [];
			controlStr.push(this.generateBeginControl(name));
			controlStr.push(this.generateMetadata());
			controlStr.push(",");
			controlStr.push(this.generateInitFn());
			controlStr.push(",");
			if (!skipRenderer) {
				controlStr.push(renderer);
				controlStr.push(",");
			}
			controlStr.push(this.generateAfterRenderingFn());
			if (this.props && this.props.length > 0) {
				controlStr.push(",");
				controlStr.push(this.generateSettersFn());
			}
			controlStr.push(this.generateEndControl());
			return controlStr.join(" ");
		},
		generateBeginControl: function (name) {
			if (!name || (name && name === "")) {
				name = "namespace.ControlName";
			}
			var begin = "sap.ui.define([";
			begin += "\"sap/ui/core/Control\"";
			begin += "], function(Control) {";
			begin += "\"use strict\";";
			begin += "return Control.extend(\"" + name + "\", {";
			return begin;
		},
		generateSeperateRenderer: function (json, name) {
			if (json) {
				this.setJSON(json);
			}
			if (!this.getJSON()) {
				console.log("No JSON available!");
				return;
			}
			if (!name || (name && name === "")) {
				name = "namespace.ControlName";
			}
			this._firstTime = true;
			var sControlName = name.substr(name.lastIndexOf(".") + 1);
			var sRenderer = "sap.ui.define([], function() {";
			sRenderer += "\"use strict\";";
			sRenderer += "var " + sControlName + " = {};";
			sRenderer += sControlName + ".render = function(oRm, oControl) {";
			sRenderer += this.renderControl(this.getJSON());
			sRenderer += "};";
			sRenderer += "return " + sControlName + ";";
			sRenderer += "},true);";
			return sRenderer;
		},
		generateEndControl: function () {
			var end = "});});";
			return end;
		},
		generateMetadata: function () {
			var meta = "\"metadata\":{ \"properties\":{";
			var allprops = [];
			$.each(this.props, function (key, value) {
				allprops.push(value.getPropMeta());
			});
			meta += allprops.join(",");
			meta += "},\"events\":{}}";
			return meta;
		},
		generateInitFn: function () {
			var InitFn = "init: function() { ";
			InitFn += "}";
			return InitFn;
		},
		generateRendererFn: function () {
			this._firstTime = true;
			var RendererFn = "renderer: function(oRm, oControl) { ";
			RendererFn += this.renderControl(this.getJSON());
			RendererFn += "}";
			return RendererFn;
		},
		generateAfterRenderingFn: function () {
			var AfterRenderingFn = "onAfterRendering: function(evt) { ";
			AfterRenderingFn += "}";
			return AfterRenderingFn;
		},
		generateSettersFn: function () {
			var propsSetters = [];
			$.each(this.props, function (key, value) {
				var sSetter = value.getSetterFn();
				if (sSetter) {
					propsSetters.push(sSetter);
				}
			});
			return propsSetters.join(",");
		},
		renderControl: function (controljson) {
			var me = this;
			var control = "oRm.write(\"<" + controljson.tag + "\");";
			if (this._firstTime) {
				this.props = [];
				control += "oRm.writeControlData(oControl);";
				this._firstTime = false;
			}
			if (controljson.style) {
				var styles = controljson.style.split(";");
				$.each(styles, function (key, value) {
					if (value) {
						var style = value.split(":");
						control += "oRm.addStyle(\"" + style[0] + "\", \"" + style[1] + "\");";
					}
				});
				control += "oRm.writeStyles();";
			}
			if (controljson.class) {
				var classes = controljson.class.split(" ");
				$.each(classes, function (key, value) {
					if (value) {
						control += "oRm.addClass(\"" + value + "\");";
					}
				});
				control += "oRm.writeClasses();";
			}
			if (controljson.src) {
				control += this.addAttribute("src");
			}
			if (controljson.href) {
				control += this.addAttribute("href");
			}
			control += "oRm.write(\">\");";
			if (controljson.html) {
				control += this.addProperty();
			}
			if (controljson.children) {
				$.each(controljson.children, function (key, value) {
					control += me.renderControl(value);
				});
			}
			control += "oRm.write(\"</" + controljson.tag + ">\");";
			return control;
		},
		addProperty: function () {
			if (!this.props) {
				return;
			}
			var l = this.getParamCount("prop");
			var sTempPropName = "prop" + (++l);
			if (this._aMappings) {
				var aFoundName = this._aMappings.filter(function (aMapping) {
					return aMapping._name === sTempPropName;
				});
			}
			var p = new Property(sTempPropName, aFoundName && aFoundName.length > 0 && aFoundName[0].value ? aFoundName[0].value :
				sTempPropName, aFoundName &&
				aFoundName.length > 0 ? aFoundName[0]._type : "string", false, aFoundName && aFoundName.length > 0 ? aFoundName[0]._generateSetter :
				true);
			this.props.push(p);
			return "oRm.writeEscaped(oControl." + p.generateFnName("get") + "());";
		},
		addAttribute: function (attr) {
			if (!this.props) {
				return;
			}
			var l = this.getParamCount(attr);
			var sTempAttrName = attr + (++l);
			if (this._aMappings) {
				var aFoundName = this._aMappings.filter(function (aMapping) {
					return aMapping._name === sTempAttrName;
				});
			}
			var p = new Property(sTempAttrName, aFoundName && aFoundName.length > 0 && aFoundName[0].value ? aFoundName[0].value :
				sTempAttrName, "string", true,
				aFoundName && aFoundName.length > 0 ? aFoundName[0]._generateSetter : true);
			this.props.push(p);
			return "oRm.writeAttributeEscaped(\"" + attr + "\",oControl." + p.generateFnName("get") + "());";
		},
		getParamCount: function (param) {
			// var l = _.countBy(this.props,function(prop){
			// 	return prop.getName().substr(0,param.length) === param?param:"Others";
			// });
			var l = 0;
			$.each(this.props, function (key, value) {
				if (value.getKey().substr(0, param.length) === param) {
					l++;
				}
			});
			return l ? l : 0;
		}
	});
});