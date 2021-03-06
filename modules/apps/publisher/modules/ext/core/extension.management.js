var ext_domain=require('extension.domain.js').extension_domain();
var utility=require('/modules/utility.js').rxt_utility();

/*
Description: All operations on the rxt data are exposed through a proxy object.
             The proxy object is responsible for managing the data and invoking actions
             such as save and fetch operations.
FileName:extension.management.js
Created Date: 8/8/2013
 */

var extension_management=function(){

    var log=new Log();

	/*
	 * A proxy which interacts with the user
	 */
	function Model(options){
		this.dataModel=new ext_domain.DataModel();
		this.adapterManager=null;
		this.template=null;	//The template of the data stored in the model
        this.actionManager=null;
		utility.config(options,this);
		this.init();
	}
	
	/*
	 * Preload the tables and fields in the template
	 * to the data model
	 */
	Model.prototype.init=function(){
		//Go through each table
		for each(var table in this.template.tables){
			
			//Go through each field
			for each(var field in table.fields){
				
				this.dataModel.setField(table.name+'.'+field.name,field.value);
			}
		}
	}

    /*
    Sets the field value
    @fieldName: The field  name in the form {table}.{field_name}
    @value: The value of the field
     */
	Model.prototype.set=function(fieldName,value){
		this.dataModel.setField(fieldName,value);
	}

    /*
    Gets the field value
    @fieldName: the field in the form {table_name}.{field_name}
    @return:If the field is present then a field object is returned ,else null
     */
	Model.prototype.get=function(fieldName){
		return this.dataModel.getField(fieldName);
	}

    /*
    Exports the model data to the provided type
    @type: The exporter type to use
    @returns: An object of the format outputed by the specified exporter
     */
	Model.prototype.export=function(type){
		var adapter=this.adapterManager.find(type);
        log.info('Invoking the exporter: '+stringify(adapter));
		return adapter.execute({model:this.dataModel,template:this.template});
	}

    /*
    Imports the provided data into the model using the specified importer type
    @type: The type of importer to use
    @inputData: An object containing data that is to be imported into the model
     */
	Model.prototype.import=function(type,inputData){
		var adapter=this.adapterManager.find(type);
		var context=this.getContext();
		context['inputData']=inputData;
        log.info('Invoking the importer: '+stringify(adapter));
		adapter.execute(context);
	}

    /*
    Saves the data based on the save properties defined in the extension file
     */
    Model.prototype.save=function(){
        //Obtain the save action map for the template
        var saveActionMap=this.actionManager.getAction(this.template.name,'save');

        //If there is no action map do nothing
        if(saveActionMap==null){
            log.info('No action map found for model type: '+this.template.shortName);
            return;
        }

        log.info('Action map found.Invoking the operation :save');

        this.invokeActionMap(saveActionMap,'save');
    }

    /*
    The function invokes the actions in the provided action map
    @actionMap:
    @actionName: The name of the action to invoke
     */
    Model.prototype.invokeActionMap=function(actionMap,actionName){

        //Process all the default actions
        var defaultAction=actionMap['default'];

        if(defaultAction!=null){

            //Obtain the handler
            var defaultHandler=this.adapterManager.findWith(function(adapter){
                return ((adapter.meta.source=='default')&&(adapter.meta.purpose==actionName))?true:false;
            });



            if(defaultHandler!=null){
                log.info('Executing default action : '+actionName+' for the operation: '+actionName);
                log.info('Handler '+stringify(defaultHandler));
                defaultHandler.execute({template:this.template,model:this.dataModel,actionMap:defaultAction,parent:this});
            }

        }

        //Execute all non default actions
        for (var action in actionMap){
            if(action!='default'){


                var handler=this.adapterManager.findWith(function(adapter){
                    return((adapter.meta.name==action)&&(adapter.meta.purpose==actionName))?true:false;
                })

                if(handler!=null){
                    log.info('Executing the action: '+action+' for operation: '+actionName)
                    handler.execute({template:this.template,model:this.dataModel,actionMap:actionMap[action],parent:this});
                }
            }
        }

        log.info('Finished invoking action map for operation: '+actionName);
    }

    //TODO: Remove this method
	Model.prototype.getContext=function(){
		return {model:this.dataModel,template:this.template};
	}
	
	/*
	 * The class is used to create models based on
	 * predefined templates
	 */
	function ModelManager(options){
		this.parser=null;
		this.adapterManager=null;
        this.actionManager=null;
		utility.config(options,this);
	}

	/*
	 Creates a model of the specified type
	 @type: The type of model to create
	 @return: A model of the provided type, or null if it is not found
	 */
	ModelManager.prototype.getModel=function(type){
		//Obtain the template of the model from the parser
		for each(var template in this.parser.templates){
			
			if(template.applyTo==type){
                log.info('A model for type: '+type+'has been created.');
				return new Model({template:template,adapterManager:this.adapterManager,actionManager:this.actionManager});
			}
		}
		log.debug('The model type: '+type+' could not be found.')
		return null;
	}
	
	return{
		ModelManager:ModelManager
	}
	
};