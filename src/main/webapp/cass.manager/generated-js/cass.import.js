var PapaParseParams = function() {};
PapaParseParams = stjs.extend(PapaParseParams, null, [], function(constructor, prototype) {
    prototype.complete = null;
    prototype.error = null;
}, {complete: {name: "Callback1", arguments: ["Object"]}, error: {name: "Callback1", arguments: ["Object"]}}, {});
/**
 *  Base class for all importers, can hold helper functions 
 *  that are useful for all importers
 *  
 *  @module org.cassproject
 *  @class Importer
 *  @abstract
 *  @author devlin.junker@eduworks.com
 */
var Importer = function() {};
Importer = stjs.extend(Importer, null, [], function(constructor, prototype) {
    constructor.isObject = function(obj) {
        return toString.call(obj) == "[object Object]";
    };
    constructor.isArray = function(obj) {
        return toString.call(obj) == "[object Array]";
    };
}, {}, {});
/**
 *  Base class for all exporters, can hold helper functions 
 *  that are useful for all exporters
 *  
 *  @module org.cassproject
 *  @class Exporter
 *  @abstract
 *  @author devlin.junker@eduworks.com
 */
var Exporter = function() {};
Exporter = stjs.extend(Exporter, null, [], null, {}, {});
/**
 *  Export methods to handle exporting two CSV file , one of competencies
 *  and one of relationships representing a framework
 *  
 *  @module org.cassproject
 *  @class CSVExport
 *  @static
 *  @extends Exporter
 *  
 *  @author devlin.junker@eduworks.com
 *  @author fritz.ray@eduworks.com
 */
var CSVExport = function() {
    Exporter.call(this);
};
CSVExport = stjs.extend(CSVExport, Exporter, [], function(constructor, prototype) {
    constructor.csvOutput = null;
    constructor.csvRelationOutput = null;
    /**
     *  Method to export the CSV files of competencies and relationships for a framework
     *  
     *  @memberOf CSVExport
     *  @method export
     *  @static
     *  @param {String} frameworkId
     *  			Id of the framework to export
     *   @param {Callback0} success
     *  			Callback triggered after both files have been successfully exported
     *   @param {Callback1<String>} failure
     *  			Callback triggered if an error occurs during export
     */
    constructor.exportFramework = function(frameworkId, success, failure) {
        if (frameworkId == null) {
            failure("Framework not selected.");
            return;
        }
        CSVExport.csvOutput = [];
        CSVExport.csvRelationOutput = [];
        EcRepository.get(frameworkId, function(data) {
            if (data.isAny(new EcFramework().getTypes())) {
                var fw = new EcFramework();
                fw.copyFrom(data);
                if (fw.competency == null || fw.competency.length == 0) 
                    failure("No Competencies in Framework");
                for (var i = 0; i < fw.competency.length; i++) {
                    var competencyUrl = fw.competency[i];
                    EcRepository.get(competencyUrl, function(competency) {
                        CSVExport.csvOutput.push(JSON.parse(competency.toJson()));
                        var props = (JSON.parse(competency.toJson()));
                        for (var prop in props) {
                            if (props[prop] != null && props[prop] != "") {
                                for (var i = 0; i < CSVExport.csvOutput.length; i++) {
                                    var row = CSVExport.csvOutput[i];
                                    if (!(row).hasOwnProperty(prop)) {
                                        (row)[prop] = "";
                                    }
                                }
                            }
                        }
                        if (CSVExport.csvOutput.length == fw.competency.length) {
                            var csv = Papa.unparse(CSVExport.csvOutput);
                            var pom = window.document.createElement("a");
                            pom.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
                            pom.setAttribute("download", fw.name + " - Competencies.csv");
                            if ((window.document)["createEvent"] != null) {
                                var event = ((window.document)["createEvent"]).call(window.document, "MouseEvents");
                                ((event)["initEvent"]).call(event, "click", true, true);
                                pom.dispatchEvent(event);
                            } else {
                                ((pom)["click"]).call(pom);
                            }
                        } else {}
                    }, failure);
                }
                for (var i = 0; i < fw.relation.length; i++) {
                    var relationUrl = fw.relation[i];
                    EcRepository.get(relationUrl, function(relation) {
                        CSVExport.csvRelationOutput.push(JSON.parse(relation.toJson()));
                        var props = (JSON.parse(relation.toJson()));
                        for (var prop in props) {
                            if (props[prop] != null && props[prop] != "") {
                                for (var i = 0; i < CSVExport.csvOutput.length; i++) {
                                    var row = CSVExport.csvOutput[i];
                                    if (!(row).hasOwnProperty(prop)) {
                                        (row)[prop] = "";
                                    }
                                }
                            }
                        }
                        if (CSVExport.csvRelationOutput.length == fw.relation.length) {
                            var csv = Papa.unparse(CSVExport.csvRelationOutput);
                            var pom = window.document.createElement("a");
                            pom.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
                            pom.setAttribute("download", fw.name + " - Relations.csv");
                            if ((window.document)["createEvent"] != null) {
                                var event = ((window.document)["createEvent"]).call(window.document, "MouseEvents");
                                ((event)["initEvent"]).call(event, "click", true, true);
                                pom.dispatchEvent(event);
                            } else {
                                ((pom)["click"]).call(pom);
                            }
                        } else {}
                    }, failure);
                }
            }
        }, failure);
    };
}, {csvOutput: {name: "Array", arguments: ["Object"]}, csvRelationOutput: {name: "Array", arguments: ["Object"]}}, {});
/**
 *  Importer methods to create competencies based on a
 *  Medbiquitous competency XML file
 *  
 *  @module org.cassproject
 *  @class MedbiqImport
 *  @static
 *  @extends Importer
 *  
 *  @author devlin.junker@eduworks.com
 *  @author fritz.ray@eduworks.com
 */
var MedbiqImport = function() {
    Importer.call(this);
};
MedbiqImport = stjs.extend(MedbiqImport, Importer, [], function(constructor, prototype) {
    constructor.medbiqXmlCompetencies = null;
    constructor.INCREMENTAL_STEP = 5;
    /**
     *  Does the legwork of looking for competencies in the XML
     *  
     *  @memberOf MedbiqImport
     *  @method medbiqXmlLookForCompetencyObject
     *  @private
     *  @static
     *  @param {Object} obj
     *  			Parsed XML Object
     */
    constructor.medbiqXmlLookForCompetencyObject = function(obj) {
        if (Importer.isObject(obj) || Importer.isArray(obj)) 
            for (var key in (obj)) {
                if (key == "CompetencyObject") 
                    MedbiqImport.medbiqXmlParseCompetencyObject((obj)[key]);
                 else 
                    MedbiqImport.medbiqXmlLookForCompetencyObject((obj)[key]);
            }
    };
    /**
     *  Does the legwork of parsing the competencies out of the parsed XML
     *  
     *  @memberOf MedbiqImport
     *  @method medbiqXmlParseCompetencyObject
     *  @private
     *  @static 
     *  @param {Object} obj
     *  			Parsed XML Object
     */
    constructor.medbiqXmlParseCompetencyObject = function(obj) {
        if (Importer.isArray(obj)) {
            for (var key in (obj)) {
                MedbiqImport.medbiqXmlParseCompetencyObject((obj)[key]);
            }
        } else {
            var newCompetency = new EcCompetency();
            if ((obj)["lom"] != null && ((obj)["lom"])["general"] != null) {
                newCompetency.name = ((((obj)["lom"])["general"])["title"])["string"].toString();
                if ((((obj)["lom"])["general"])["description"] != null) 
                    newCompetency.description = ((((obj)["lom"])["general"])["description"])["string"].toString();
                if ((((obj)["lom"])["general"])["identifier"] != null) 
                    newCompetency.url = ((((obj)["lom"])["general"])["identifier"])["entry"].toString();
                if (newCompetency.description == null) 
                    newCompetency.description = "";
                MedbiqImport.medbiqXmlCompetencies.push(newCompetency);
            }
        }
    };
    /**
     *  Analyzes a Medbiquitous XML file for competencies and saves them for use in the import process
     *  
     *  @memberOf MedbiqImport
     *  @method analyzeFile
     *  @static
     *  @param {Object} file
     *  			Medbiquitous XML file
     *  @param {Callback1<Array<EcCompetency>>} success
     *  			Callback triggered on succesfully analyzing competencies, 
     *  			returns an array of all of the competencies found
     *  @param {Callback1<String>} [failure]
     *  			Callback triggered on error analyzing file
     */
    constructor.analyzeFile = function(file, success, failure) {
        if (file == null) {
            failure("No file to analyze");
            return;
        }
        if ((file)["name"] == null) {
            failure("Invalid file");
            return;
        } else if (!((file)["name"]).endsWith(".xml")) {
            failure("Invalid file type");
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var result = ((e)["target"])["result"];
            var jsonObject = new X2JS().xml_str2json(result);
            MedbiqImport.medbiqXmlCompetencies = [];
            MedbiqImport.medbiqXmlLookForCompetencyObject(jsonObject);
            success(MedbiqImport.medbiqXmlCompetencies);
        };
        reader.onerror = function(p1) {
            failure("Error Reading File");
        };
        reader.readAsText(file);
    };
    constructor.progressObject = null;
    constructor.saved = 0;
    /**
     *  Method for actually creating the competencies in the CASS repository after a
     *  Medbiquitous XML file has been parsed. Must be called after analyzeFile
     *  
     *  @memberOf MedbiqImport
     *  @method importCompetencies
     *  @static
     *  @param {String} serverUrl
     *  			URL Prefix for the created competencies (and relationships?)
     *  @param {EcIdentity} owner
     *  			EcIdentity that will own the created competencies (and relationships?)
     *  @param {Callback1<Array<EcCompetency>>} success
     *  			Callback triggered after successfully creating the competencies from the XML file
     *  @param {Callback1<Object>} [failure]
     *  			Callback triggered if there is an error while creating the competencies
     *  @param {Callback1<Object>} [incremental]
     *  			Callback triggered incrementally while the competencies are being created to show progress,
     *  			returns an object indicating the number of competencies created so far
     */
    constructor.importCompetencies = function(serverUrl, owner, success, failure, incremental) {
        MedbiqImport.progressObject = null;
        MedbiqImport.saved = 0;
        for (var i = 0; i < MedbiqImport.medbiqXmlCompetencies.length; i++) {
            var comp = MedbiqImport.medbiqXmlCompetencies[i];
            comp.generateId(serverUrl);
            if (owner != null) 
                comp.addOwner(owner.ppk.toPk());
            comp.save(function(p1) {
                MedbiqImport.saved++;
                if (MedbiqImport.saved % MedbiqImport.INCREMENTAL_STEP == 0) {
                    if (MedbiqImport.progressObject == null) 
                        MedbiqImport.progressObject = new Object();
                    (MedbiqImport.progressObject)["competencies"] = MedbiqImport.saved;
                    incremental(MedbiqImport.progressObject);
                }
                if (MedbiqImport.saved == MedbiqImport.medbiqXmlCompetencies.length) {
                    if (MedbiqImport.progressObject == null) 
                        MedbiqImport.progressObject = new Object();
                    (MedbiqImport.progressObject)["competencies"] = MedbiqImport.saved;
                    incremental(MedbiqImport.progressObject);
                    success(MedbiqImport.medbiqXmlCompetencies);
                }
            }, function(p1) {
                failure("Failed to Save Competency");
            });
        }
    };
}, {medbiqXmlCompetencies: {name: "Array", arguments: ["EcCompetency"]}, progressObject: "Object"}, {});
/**
 *  Import methods to handle an CSV file of competencies and a 
 *  CSV file of relationships and store them in a CASS instance
 *  
 *  @module org.cassproject
 *  @class CSVImport
 *  @static
 *  @extends Importer
 *  
 *  @author devlin.junker@eduworks.com
 *  @author fritz.ray@eduworks.com
 */
var CSVImport = function() {};
CSVImport = stjs.extend(CSVImport, null, [], function(constructor, prototype) {
    constructor.INCREMENTAL_STEP = 5;
    /**
     *  Analyzes a CSV File to return the column names to the user for specifying
     *  which columns contain which data. This should be called before import.
     *  
     *  @memberOf CSVImport
     *  @method analyzeFile
     *  @static
     *  @param {Object} file
     *  			CSV file to be analyzed
     *  @param {Callback1<Object>} success
     *  			Callback triggered after successfully analyzing the CSV file
     *  @param {Callback1<Object>} [failure]
     *  			Callback triggered if there is an error analyzing the CSV file
     */
    constructor.analyzeFile = function(file, success, failure) {
        if (file == null) {
            failure("No file to analyze");
            return;
        }
        if ((file)["name"] == null) {
            failure("Invalid file");
        } else if (!((file)["name"]).endsWith(".csv")) {
            failure("Invalid file type");
        }
        Papa.parse(file, {complete: function(results) {
            var tabularData = (results)["data"];
            success(tabularData);
        }, error: failure});
    };
    constructor.importCsvLookup = null;
    constructor.saved = 0;
    constructor.progressObject = null;
    /**
     *  Helper function to transform a competencies oldID to match the new server url
     *  
     *  @memberOf CSVImport
     *  @method transformId
     *  @private
     *  @static
     *  @param {String} oldId
     *  			Old ID found in the CSV file
     *  @param {EcRemoteLinkedData} newObject
     *  			New competency being created
     *  @param {String} selectedServer
     *  			New URL Prefix that the new competency's ID should match
     */
    constructor.transformId = function(oldId, newObject, selectedServer) {
        if (oldId == null || oldId == "") 
            oldId = generateUUID();
        if (oldId.indexOf("http") != -1) {
            var parts = (oldId).split("/");
            var guid = null;
            var timestamp = null;
            var pattern = new RegExp("^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", "i");
            for (var i = 0; i < parts.length; i++) {
                if (!isNaN(parseInt(parts[i]))) 
                    timestamp = parts[i];
                 else if (pattern.test(parts[i])) 
                    guid = parts[i];
            }
            if (guid == null) 
                newObject.assignId(selectedServer, parts[parts.length - 2]);
             else 
                newObject.assignId(selectedServer, guid);
        } else 
            newObject.assignId(selectedServer, oldId);
    };
    /**
     *  Method to create competencies (and relationships if the parameters are passed in)
     *  based on a CSV file and references to which columns correspond to which pieces
     *  of data.
     *  
     *  @memberOf CSVImport
     *  @method importCompetencies
     *  @static
     *  @param {Object} file
     *  			CSV File to import competencies from
     *  @param {String} serverUrl
     *  			URL Prefix for the created competencies (and relationships?)
     *  @param {EcIdentity} owner
     *  			EcIdentity that will own the created competencies (and relationships?)
     *  @param {int} nameIndex
     *  			Index of the column that contains the competency names
     *  @param {int} descriptionIndex
     *  			Index of the column that contains the competency descriptions
     *  @param {int} scopeIndex
     *  			Index of the column that contains the competency scopes
     *  @param {int} idIndex
     *  			Index of the column that contains the old competency ID (Optional, if not exists pass null or negative)
     *  @param {Object} [relations]
     *  			CSV File to import relationships from (Optional, if not exists pass null)
     *  @param {int} [sourceIndex]
     *  			Index (in relation file) of the column containing the relationship source competency ID (Optional, if not exists pass null or negative)
     *  @param {int} [relationTypeIndex]
     *  			Index (in relation file) of the column containing the relationship type (Optional, if not exists pass null or negative)
     *  @param {int} [destIndex]
     *  			Index (in relation file) of the column containing the relationship destination competency ID (Optional, if not exists pass null or negative)
     *  @param {Callback2<Array<EcCompetency>, Array<EcAlignment>>} success
     *  			Callback triggered after the competencies (and relationships?) have been created
     *  @param {Callback1<Object>} [failure]
     *  			Callback triggered if an error during creating the competencies
     *  @param {Callback1<Object>} [incremental]
     *  			Callback triggered incrementally during creation of competencies to indicate progress,
     *  			returns an object indicating the number of competencies (and relationships?) created so far
     *  			
     */
    constructor.importCompetencies = function(file, serverUrl, owner, nameIndex, descriptionIndex, scopeIndex, idIndex, relations, sourceIndex, relationTypeIndex, destIndex, success, failure, incremental) {
        CSVImport.progressObject = null;
        CSVImport.importCsvLookup = new Object();
        if (nameIndex < 0) {
            failure("Name Index not Set");
            return;
        }
        var competencies = [];
        Papa.parse(file, {complete: function(results) {
            var tabularData = (results)["data"];
            var colNames = tabularData[0];
            for (var i = 1; i < tabularData.length; i++) {
                var competency = new EcCompetency();
                if (tabularData[i].length == 0 || (tabularData[i].length == 1 && (tabularData[i][0] == null || tabularData[i][0] == ""))) {
                    continue;
                }
                if (tabularData[i][nameIndex] == null || tabularData[i][nameIndex] == "") {
                    continue;
                }
                competency.name = tabularData[i][nameIndex];
                if (descriptionIndex >= 0) 
                    competency.description = tabularData[i][descriptionIndex];
                if (scopeIndex >= 0) 
                    competency.scope = tabularData[i][scopeIndex];
                var shortId = null;
                if (idIndex != null && idIndex >= 0) {
                    competency.id = tabularData[i][idIndex];
                    shortId = competency.shortId();
                }
                if (idIndex != null && idIndex >= 0) 
                    CSVImport.transformId(tabularData[i][idIndex], competency, serverUrl);
                 else 
                    competency.generateId(serverUrl);
                if (idIndex != null && idIndex >= 0 && tabularData[i][idIndex] != null && tabularData[i][idIndex] != "") {
                    if ((CSVImport.importCsvLookup)[tabularData[i][idIndex]] != null) 
                        continue;
                    (CSVImport.importCsvLookup)[tabularData[i][idIndex]] = competency.shortId();
                } else if ((CSVImport.importCsvLookup)[competency.name] != null) 
                    continue;
                (CSVImport.importCsvLookup)[competency.name] = competency.shortId();
                if (shortId != null && idIndex >= 0) 
                    (CSVImport.importCsvLookup)[shortId] = competency.shortId();
                if (owner != null) 
                    competency.addOwner(owner.ppk.toPk());
                for (var idx = 0; idx < tabularData[i].length; idx++) {
                    if (colNames[idx] == null || colNames[idx] == "" || colNames[idx].startsWith("@") || idx == nameIndex || idx == descriptionIndex || idx == scopeIndex || idx == idIndex) {
                        continue;
                    } else {
                        (competency)[colNames[idx]] = tabularData[i][idx];
                    }
                }
                competencies.push(competency);
            }
            CSVImport.saved = 0;
            for (var i = 0; i < competencies.length; i++) {
                var comp = competencies[i];
                comp.save(function(results) {
                    CSVImport.saved++;
                    if (CSVImport.saved % CSVImport.INCREMENTAL_STEP == 0) {
                        if (CSVImport.progressObject == null) 
                            CSVImport.progressObject = new Object();
                        (CSVImport.progressObject)["competencies"] = CSVImport.saved;
                        incremental(CSVImport.progressObject);
                    }
                    if (CSVImport.saved == competencies.length) {
                        if (relations == null) 
                            success(competencies, new Array());
                         else 
                            CSVImport.importRelations(serverUrl, owner, relations, sourceIndex, relationTypeIndex, destIndex, competencies, success, failure, incremental);
                    }
                }, function(results) {
                    failure("Failed to save competency");
                    for (var j = 0; j < competencies.length; j++) {
                        competencies[j]._delete(null, null, null);
                    }
                });
            }
        }, error: failure});
    };
    /**
     *  Handles actually importing the relationships from the relationship CSV file
     *  
     *  @memberOf CSVImport
     *  @method importRelations
     *  @private
     *  @static
     *  @param {String} serverUrl
     *  			URL Prefix for the created competencies (and relationships?)
     *  @param {EcIdentity} owner
     *  			EcIdentity that will own the created competencies (and relationships?)
     *  @param {Object} file
     *  			CSV File to import competencies from
     *  @param {int} sourceIndex
     * 			Index (in relation file) of the column containing the relationship source competency ID
     *  @param {int} relationTypeIndex
     *  			Index (in relation file) of the column containing the relationship type
     *  @param {int} destIndex
     *  			Index (in relation file) of the column containing the relationship destination competency ID
     *  @param {Array<EcCompetency>} competencies
     *  			Array of newly created competencies
     *  @param {Callback2<Array<EcCompetency>, Array<EcAlignment>>} success
     *  			Callback triggered after the relationships have been created
     *  @param {Callback1<Object>} failure
     *  			Callback triggered if an error during creating the relationships
     *  @param {Callback1<Object>} incremental
     *  			Callback triggered incrementally during creation to indicate progress
     */
    constructor.importRelations = function(serverUrl, owner, file, sourceIndex, relationTypeIndex, destIndex, competencies, success, failure, incremental) {
        var relations = new Array();
        if (sourceIndex == null || sourceIndex < 0) {
            failure("Source Index not Set");
            return;
        }
        if (relationTypeIndex == null || relationTypeIndex < 0) {
            failure("Relation Type Index not Set");
            return;
        }
        if (destIndex == null || destIndex < 0) {
            failure("Destination Index not Set");
            return;
        }
        Papa.parse(file, {complete: function(results) {
            var tabularData = (results)["data"];
            for (var i = 1; i < tabularData.length; i++) {
                var alignment = new EcAlignment();
                var sourceKey = tabularData[i][sourceIndex];
                var relationTypeKey = tabularData[i][relationTypeIndex];
                var destKey = tabularData[i][destIndex];
                if ((CSVImport.importCsvLookup)[sourceKey] == null) 
                    continue;
                if ((CSVImport.importCsvLookup)[destKey] == null) 
                    continue;
                alignment.source = (CSVImport.importCsvLookup)[sourceKey];
                alignment.relationType = relationTypeKey;
                alignment.target = (CSVImport.importCsvLookup)[destKey];
                if (owner != null) 
                    alignment.addOwner(owner.ppk.toPk());
                alignment.generateId(serverUrl);
                relations.push(alignment);
            }
            CSVImport.saved = 0;
            for (var i = 0; i < relations.length; i++) {
                var comp = relations[i];
                comp.save(function(results) {
                    CSVImport.saved++;
                    if (CSVImport.saved % CSVImport.INCREMENTAL_STEP == 0) {
                        if (CSVImport.progressObject == null) 
                            CSVImport.progressObject = new Object();
                        (CSVImport.progressObject)["relations"] = CSVImport.saved;
                        incremental(CSVImport.progressObject);
                        incremental(CSVImport.saved);
                    }
                    if (CSVImport.saved == relations.length) {
                        success(competencies, relations);
                    }
                }, function(results) {
                    failure("Failed to save competency or relation");
                    for (var j = 0; j < competencies.length; j++) {
                        competencies[j]._delete(null, null, null);
                    }
                    for (var j = 0; j < relations.length; j++) {
                        relations[j]._delete(null, null);
                    }
                });
            }
        }, error: failure});
    };
}, {importCsvLookup: "Object", progressObject: "Object"}, {});
/**
 *  Import methods to handle an ASN JSON file containing a framework,
 *  competencies and relationships, and store them in a CASS instance
 *  
 *  @module org.cassproject
 *  @class ASNImport
 *  @static
 *  @extends Importer
 *  
 *  @author devlin.junker@eduworks.com
 *  @author fritz.ray@eduworks.com
 */
var ASNImport = function() {
    Importer.call(this);
};
ASNImport = stjs.extend(ASNImport, Importer, [], function(constructor, prototype) {
    constructor.INCREMENTAL_STEP = 5;
    constructor.jsonFramework = null;
    constructor.frameworkUrl = null;
    constructor.jsonCompetencies = null;
    constructor.competencyCount = 0;
    constructor.relationCount = 0;
    /**
     *  Recursive function that looks through the file and saves each
     *  competency object in a map for use during importing. It also counts 
     *  the number of competencies and relationships that it finds
     *  
     *  @memberOf ASNImport
     *  @method asnJsonPrime
     *  @private
     *  @static
     *  @param {Object} obj	
     *  			The current JSON object we're examining for comepetencies and reationships
     *  @param {String} key
     *  			The ASN identifier of the current object
     */
    constructor.asnJsonPrime = function(obj, key) {
        var value = (obj)[key];
        if (Importer.isObject(value)) {
            if ((value)["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] != null) {
                var stringVal = (((value)["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"])["0"])["value"];
                if (stringVal == "http://purl.org/ASN/schema/core/Statement") {
                    ASNImport.jsonCompetencies[key] = value;
                    ASNImport.competencyCount++;
                    var children = (value)["http://purl.org/gem/qualifiers/hasChild"];
                    if (children != null) 
                        for (var j = 0; j < children.length; j++) {
                            ASNImport.relationCount++;
                            ASNImport.asnJsonPrime(obj, (children[j])["value"]);
                        }
                }
            }
        }
    };
    /**
     *  Does the actual legwork of looking for competencies and relationships. 
     *  
     *  This function finds the framework information, and pulls out the competency 
     *  objects array to be scanned by asnJsonPrime
     *  
     *  @memberOf ASNImport
     *  @method lookThroughSource
     *  @private
     *  @static
     *  @param {Object} obj
     *  			ASN JSON Object from file that contains framework information and competencies/relationships
     */
    constructor.lookThroughSource = function(obj) {
        ASNImport.competencyCount = 0;
        ASNImport.relationCount = 0;
        for (var key in (obj)) {
            var value = (obj)[key];
            if (Importer.isObject(value)) {
                if ((value)["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"] != null) {
                    var stringVal = (((value)["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"])["0"])["value"];
                    if (stringVal == "http://purl.org/ASN/schema/core/StandardDocument") {
                        ASNImport.jsonFramework = value;
                        ASNImport.frameworkUrl = key;
                        var children = (value)["http://purl.org/gem/qualifiers/hasChild"];
                        if (children != null) 
                            for (var j = 0; j < children.length; j++) {
                                ASNImport.asnJsonPrime(obj, (children[j])["value"]);
                            }
                    }
                }
            }
        }
    };
    /**
     *  Analyzes an ASN File for competencies and relationships. 
     *  
     *  This should be called before import, the sucess callback returns an object
     *  indicating the number of competencies and relationships found.
     *  
     *  @memberOf ASNImport
     *  @method analyzeFile
     *  @static
     *  @param {Object} file
     *  			ASN JSON file
     *  @param {Callback1<Object>} success
     *  			Callback triggered on successful analysis of file
     *  @param {Callback1<Object>} [failure]
     *  			Callback triggered if there is an error during analysis of the file
     */
    constructor.analyzeFile = function(file, success, failure) {
        if (file == null) {
            failure("No file to analyze");
            return;
        }
        if ((file)["name"] == null) {
            failure("Invalid file");
            return;
        } else if (!((file)["name"]).endsWith(".json")) {
            failure("Invalid file type");
            return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
            var result = ((e)["target"])["result"];
            var jsonObj = JSON.parse(result);
            ASNImport.jsonCompetencies = {};
            ASNImport.jsonFramework = null;
            ASNImport.frameworkUrl = "";
            ASNImport.lookThroughSource(jsonObj);
            if (ASNImport.jsonFramework == null) {
                failure("Could not find StandardDocument.");
            } else {
                success(ASNImport.jsonCompetencies);
            }
        };
        reader.readAsText(file);
    };
    constructor.importedFramework = null;
    constructor.competencies = null;
    constructor.progressObject = null;
    /**
     *  Method to import the competencies from an ASN JSON file, 
     *  should be called after analyzing the file
     *  
     *  @memberOf ASNImport
     *  @method importCompetencies
     *  @static
     *  @param {String} serverUrl
     *  			URL Prefix for the competencies to be imported
     *  @param {EcIdentity} owner
     *  			EcIdentity that will own the new competencies
     *  @param {boolean} createFramework
     *  			Flag to create a framework and include the competencies and relationships created 
     *  @param {Callback2<Array<EcCompetency>, EcFramework>} success
     *  			Callback triggered after the competencies (and framework?) are created
     *  @param {Callback1<Object>} failure
     *  			Callback triggered if an error occurs while creating the competencies 
     *  @param {Callback1<Object>} [incremental]
     *  			Callback triggered incrementally during the creation of competencies to indicate progress,
     *  			returns an object indicating the number of competencies (and relationships?) created so far
     */
    constructor.importCompetencies = function(serverUrl, owner, createFramework, success, failure, incremental) {
        ASNImport.competencies = {};
        if (createFramework) {
            ASNImport.importedFramework = new EcFramework();
            ASNImport.importedFramework.competency = [];
            ASNImport.importedFramework.relation = [];
        } else {
            ASNImport.importedFramework = null;
        }
        ASNImport.progressObject = null;
        ASNImport.createCompetencies(serverUrl, owner, function() {
            ASNImport.createRelationships(serverUrl, owner, ASNImport.jsonFramework, null, function() {
                if (createFramework) {
                    ASNImport.createFramework(serverUrl, owner, success, failure);
                } else {
                    var compList = [];
                    for (var key in ASNImport.competencies) {
                        compList.push(ASNImport.competencies[key]);
                    }
                    if (success != null) 
                        success(compList, null);
                }
            }, failure, incremental);
        }, failure, incremental);
    };
    constructor.savedCompetencies = 0;
    /**
     *  Handles creating the competencies found during analysis, iterates through the
     *  competency ASN objects saved and creates them in the CASS repository at the URL given. 
     *  
     *  @memberOf ASNImport
     *  @method createCompetencies
     *  @private
     *  @static
     *  @param {String} serverUrl
     *  			URL Prefix for the competencies to be imported
     *  @param {EcIdentity} owner
     *  			EcIdentity that will own the new competencies
     *  @param {Callback0} success
     *  			Callback triggered after the competencies are created
     *  @param {Callback1<Object>} failure
     *  			Callback triggered if an error occurs while creating the competencies 
     *  @param {Callback1<Object>} [incremental]
     *  			Callback triggered incrementally during the creation of competencies to indicate progress
     */
    constructor.createCompetencies = function(serverUrl, owner, success, failure, incremental) {
        ASNImport.savedCompetencies = 0;
        for (var key in ASNImport.jsonCompetencies) {
            var comp = new EcCompetency();
            var jsonComp = ASNImport.jsonCompetencies[key];
            if ((jsonComp)["http://purl.org/dc/elements/1.1/title"] == null) 
                comp.name = (((jsonComp)["http://purl.org/dc/terms/description"])["0"])["value"];
             else 
                comp.name = (((jsonComp)["http://purl.org/dc/elements/1.1/title"])["0"])["value"];
            comp.sameAs = key;
            if ((jsonComp)["http://purl.org/dc/terms/description"] != null) 
                comp.description = (((jsonComp)["http://purl.org/dc/terms/description"])["0"])["value"];
            comp.generateId(serverUrl);
            if (owner != null) 
                comp.addOwner(owner.ppk.toPk());
            if (ASNImport.importedFramework != null) 
                ASNImport.importedFramework.addCompetency(comp.shortId());
            ASNImport.competencies[key] = comp;
            comp.save(function(p1) {
                ASNImport.savedCompetencies++;
                if (ASNImport.savedCompetencies % ASNImport.INCREMENTAL_STEP == 0) {
                    if (ASNImport.progressObject == null) 
                        ASNImport.progressObject = new Object();
                    (ASNImport.progressObject)["competencies"] = ASNImport.savedCompetencies;
                    incremental(ASNImport.progressObject);
                }
                if (ASNImport.savedCompetencies == ASNImport.competencyCount) {
                    if (ASNImport.progressObject == null) 
                        ASNImport.progressObject = new Object();
                    (ASNImport.progressObject)["competencies"] = ASNImport.savedCompetencies;
                    incremental(ASNImport.progressObject);
                    success();
                }
            }, function(p1) {
                failure("Failed to save competency");
            });
        }
    };
    constructor.savedRelations = 0;
    /**
     *  Handles creating the relationships from the file analyzed earlier.
     *  Recursively travels through looking for the hasChild field and creates
     *  relationships based off of that.
     *  
     *  @memberOf ASNImport
     *  @method createRelationships
     *  @private
     *  @static
     *  @param {String} serverUrl
     *  			URL Prefix for the relationships to be imported
     *  @param {EcIdentity} owner
     *  			EcIdentity that will own the new relationships
     *  @param {Object} node
     *  
     *  @param {String} nodeId
     *  
     *  @param {Callback0} success
     *  			Callback triggered after the relationships are created
     *  @param {Callback1<Object>} failure
     *  			Callback triggered if an error occurs while creating the relationships 
     *  @param {Callback1<Object>} incremental
     *  			Callback triggered incrementally during the creation of relationships to indicate progress
     */
    constructor.createRelationships = function(serverUrl, owner, node, nodeId, success, failure, incremental) {
        ASNImport.savedRelations = 0;
        if (ASNImport.relationCount == 0) {
            success();
        }
        var children = (node)["http://purl.org/gem/qualifiers/hasChild"];
        if (children != null) 
            for (var j = 0; j < children.length; j++) {
                if (nodeId != null) {
                    var relation = new EcAlignment();
                    relation.target = ASNImport.competencies[nodeId].shortId();
                    relation.source = ASNImport.competencies[(children[j])["value"]].shortId();
                    relation.relationType = "narrows";
                    relation.name = "";
                    relation.description = "";
                    relation.generateId(serverUrl);
                    if (owner != null) 
                        relation.addOwner(owner.ppk.toPk());
                    if (ASNImport.importedFramework != null) 
                        ASNImport.importedFramework.addRelation(relation.shortId());
                    relation.save(function(p1) {
                        ASNImport.savedRelations++;
                        if (ASNImport.savedRelations % ASNImport.INCREMENTAL_STEP == 0) {
                            if (ASNImport.progressObject == null) 
                                ASNImport.progressObject = new Object();
                            (ASNImport.progressObject)["relations"] = ASNImport.savedRelations;
                            incremental(ASNImport.progressObject);
                        }
                        if (ASNImport.savedRelations == ASNImport.relationCount) {
                            success();
                        }
                    }, function(p1) {
                        failure("Failed to save Relationship");
                    });
                }
                ASNImport.createRelationships(serverUrl, owner, ASNImport.jsonCompetencies[(children[j])["value"]], (children[j])["value"], success, failure, incremental);
            }
    };
    /**
     *  Handles creating the framework if the createFramework flag was set
     *  
     *  @meberOf ASNImport
     *  @method createFramework
     *  @private
     *  @static
     *  @param {String} serverUrl
     *  			URL Prefix for the framework to be imported
     *  @param {EcIdentity} owner
     *  			EcIdentity that will own the new framework
     *  @param {Callback2<Array<EcCompetency>, EcFramework>} success
     *  			Callback triggered after the framework is created
     *  @param {Callback1<Object>} failure
     *  			Callback triggered if there is an error during the creation of framework
     */
    constructor.createFramework = function(serverUrl, owner, success, failure) {
        ASNImport.importedFramework.name = (((ASNImport.jsonFramework)["http://purl.org/dc/elements/1.1/title"])["0"])["value"];
        ASNImport.importedFramework.description = (((ASNImport.jsonFramework)["http://purl.org/dc/terms/description"])["0"])["value"];
        ASNImport.importedFramework.generateId(serverUrl);
        ASNImport.importedFramework.sameAs = ASNImport.frameworkUrl;
        if (owner != null) 
            ASNImport.importedFramework.addOwner(owner.ppk.toPk());
        ASNImport.importedFramework.save(function(p1) {
            var compList = [];
            for (var key in ASNImport.competencies) {
                compList.push(ASNImport.competencies[key]);
            }
            if (success != null) 
                success(compList, ASNImport.importedFramework);
        }, function(p1) {
            failure("Failed to save framework");
        });
    };
}, {jsonFramework: "Object", jsonCompetencies: {name: "Map", arguments: [null, "Object"]}, importedFramework: "EcFramework", competencies: {name: "Map", arguments: [null, "EcCompetency"]}, progressObject: "Object"}, {});
/**
 *  Importer methods to copy or link to competencies that already
 *  exist in another framework in a CASS instance.
 *  
 *  @module org.cassproject
 *  @class FrameworkImport
 *  @static
 *  @extends Importer
 *  
 *  @author devlin.junker@eduworks.com
 */
var FrameworkImport = function() {};
FrameworkImport = stjs.extend(FrameworkImport, null, [], function(constructor, prototype) {
    constructor.savedComp = 0;
    constructor.savedRel = 0;
    constructor.targetUsable = null;
    constructor.competencies = null;
    constructor.relations = null;
    constructor.compMap = null;
    /**
     *  Copies or links competencies that exist in one framework in a CASS instance, 
     *  to another different framework in the same CASS instance.
     *  
     *  @memberOf FrameworkImport
     *  @method importCompetencies
     *  @static
     *  @param {EcFramework} source
     *  			Framework to copy or link the competencies from
     *  @param {EcFramework} target
     *  			Framework to add the copied or linked competencies to
     *  @param {boolean} copy
     *  			Flag indicating whether or not to copy or link the competencies in the source framework
     *  @param {String} serverUrl
     *  			URL Prefix for the created competencies if copied
     *  @param {EcIdentity} owner
     *  			EcIdentity that will own the created competencies if copied
     *  @param {Callback1<Array<EcCompetency>>} success
     *  			Callback triggered after succesfully copying or linking all of the competencies,
     *  			returns an array of the new or linked competencies
     *  @param {Callback1<Object>} [failure]
     *  			Callback triggered if an error occurred while creating the competencies
     */
    constructor.importCompetencies = function(source, target, copy, serverUrl, owner, success, failure) {
        if (source == null) {
            failure("Source Framework not set");
            return;
        }
        if (target == null) {
            failure("Target Framework not Set");
            return;
        }
        FrameworkImport.targetUsable = target;
        if (source.competency == null || source.competency.length == 0) {
            failure("Source Has No Competencies");
            return;
        }
        FrameworkImport.competencies = [];
        FrameworkImport.relations = [];
        if (copy) {
            FrameworkImport.compMap = {};
            FrameworkImport.savedComp = 0;
            FrameworkImport.savedRel = 0;
            for (var i = 0; i < source.competency.length; i++) {
                var id = source.competency[i];
                EcCompetency.get(id, function(comp) {
                    var competency = new EcCompetency();
                    competency.copyFrom(comp);
                    competency.generateId(serverUrl);
                    FrameworkImport.compMap[comp.shortId()] = competency.shortId();
                    if (owner != null) 
                        competency.addOwner(owner.ppk.toPk());
                    var id = competency.id;
                    competency.save(function(str) {
                        FrameworkImport.savedComp++;
                        FrameworkImport.targetUsable.addCompetency(id);
                        if (FrameworkImport.savedComp == FrameworkImport.competencies.length) {
                            FrameworkImport.targetUsable.save(function(p1) {
                                for (var i = 0; i < source.relation.length; i++) {
                                    var id = source.relation[i];
                                    EcAlignment.get(id, function(rel) {
                                        var relation = new EcAlignment();
                                        relation.copyFrom(rel);
                                        relation.generateId(serverUrl);
                                        relation.source = FrameworkImport.compMap[rel.source];
                                        relation.target = FrameworkImport.compMap[rel.target];
                                        if (owner != null) 
                                            relation.addOwner(owner.ppk.toPk());
                                        var id = relation.id;
                                        relation.save(function(str) {
                                            FrameworkImport.savedRel++;
                                            FrameworkImport.targetUsable.addRelation(id);
                                            if (FrameworkImport.savedRel == FrameworkImport.relations.length) {
                                                FrameworkImport.targetUsable.save(function(p1) {
                                                    success(FrameworkImport.competencies, FrameworkImport.relations);
                                                }, function(p1) {
                                                    failure(p1);
                                                });
                                            }
                                        }, function(str) {
                                            failure("Trouble Saving Copied Competency");
                                        });
                                        FrameworkImport.relations.push(relation);
                                    }, function(str) {
                                        failure(str);
                                    });
                                }
                            }, function(p1) {
                                failure(p1);
                            });
                        }
                    }, function(str) {
                        failure("Trouble Saving Copied Competency");
                    });
                    FrameworkImport.competencies.push(competency);
                }, function(str) {
                    failure(str);
                });
            }
        } else {
            for (var i = 0; i < source.competency.length; i++) {
                if (target.competency == null || (target.competency.indexOf(source.competency[i]) == -1 && target.competency.indexOf(EcRemoteLinkedData.trimVersionFromUrl(source.competency[i])) == -1)) {
                    EcCompetency.get(source.competency[i], function(comp) {
                        FrameworkImport.competencies.push(comp);
                        FrameworkImport.targetUsable.addCompetency(comp.id);
                        if (FrameworkImport.competencies.length == source.competency.length) {
                            delete (FrameworkImport.targetUsable)["competencyObjects"];
                            FrameworkImport.targetUsable.save(function(p1) {
                                for (var i = 0; i < source.relation.length; i++) {
                                    if (target.relation == null || (target.relation.indexOf(source.relation[i]) == -1 && target.relation.indexOf(EcRemoteLinkedData.trimVersionFromUrl(source.competency[i])) == -1)) {
                                        EcAlignment.get(source.relation[i], function(relation) {
                                            FrameworkImport.relations.push(relation);
                                            FrameworkImport.targetUsable.addRelation(relation.id);
                                            if (FrameworkImport.relations.length == source.relation.length) {
                                                delete (FrameworkImport.targetUsable)["competencyObjects"];
                                                FrameworkImport.targetUsable.save(function(p1) {
                                                    success(FrameworkImport.competencies, FrameworkImport.relations);
                                                }, function(p1) {
                                                    failure(p1);
                                                });
                                            }
                                        }, function(p1) {
                                            failure(p1);
                                        });
                                    }
                                }
                            }, function(p1) {
                                failure(p1);
                            });
                        }
                    }, function(p1) {
                        failure(p1);
                    });
                }
            }
        }
    };
}, {targetUsable: "EcFramework", competencies: {name: "Array", arguments: ["EcCompetency"]}, relations: {name: "Array", arguments: ["EcAlignment"]}, compMap: {name: "Map", arguments: [null, null]}}, {});
