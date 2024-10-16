import { as, mixin } from "@jangaroo/runtime";
import ContentSyncPluginResources_properties from "../ContentSyncPluginResources_properties";
import ExcludeListRadioGroupBase from "../component/ExcludeListRadioGroupBase";
import ContentSyncConstants from "../constant/ContentSyncConstants";
import ContentSyncModel from "../model/ContentSyncModel";
import ContentSyncReferenceModel from "../model/ContentSyncReferenceModel";
import ContentSyncSettings from "../model/ContentSyncSettings";
import IContentSyncHelper from "./IContentSyncHelper";
import ContentLocalizationUtil from "@coremedia/studio-client.cap-base-models/content/ContentLocalizationUtil";
import Content from "@coremedia/studio-client.cap-rest-client/content/Content";
import Struct from "@coremedia/studio-client.cap-rest-client/struct/Struct";
import RemoteServiceMethod from "@coremedia/studio-client.client-core-impl/data/impl/RemoteServiceMethod";
import Bean from "@coremedia/studio-client.client-core/data/Bean";
import RemoteBean from "@coremedia/studio-client.client-core/data/RemoteBean";
import beanFactory from "@coremedia/studio-client.client-core/data/beanFactory";
import FolderTreeNode from "@coremedia/studio-client.ext.ui-components/plugins/FolderTreeNode";
import editorContext from "@coremedia/studio-client.main.editor-components/sdk/editorContext";
import Deferred from "@jangaroo/ext-ts/Deferred";
import Base64 from "@jangaroo/ext-ts/util/Base64";
import IResourceManager from "@jangaroo/runtime/l10n/IResourceManager";
import resourceManager from "@jangaroo/runtime/l10n/resourceManager";
import trace from "@jangaroo/runtime/trace";


class ContentSyncHelperImpl implements IContentSyncHelper {

  static readonly #CS_BASE_URL:string = "contentsync/";
  static readonly #CS_ID_SEGMENT:string = "/content/id/";
  static readonly #CS_WFS_RUNNING:string = "/running";
  static readonly #CS_WFS_ABORT:string = "/abort/";
  static readonly #REFERENCES:string = "/references/";
  static readonly #CS_SETTING_LOCATION:string = "/Settings/Options/Settings/Content sync/ContentSyncSettings";
  static readonly #CM_SETTINGS_SETTINGS_PROP:string = "settings";
  static readonly #ENVIRONMENTS:string = "environments";
  static readonly #NO_IDENT:string = "NO_IDENT";
  static readonly #PROPERTY_EXCLUDES:string = "propertyExcludes";
  static readonly #CONTENT_TYPE_EXCLUDES:string = "contentTypeExcludes";
  static #resourceManager:IResourceManager = resourceManager;

  getContentById(id:string, ident:string, modelBean:Bean):ContentSyncModel {
    var url = ContentSyncHelperImpl.#CS_BASE_URL
            .concat(ident)
            .concat(ContentSyncHelperImpl.#CS_ID_SEGMENT)
            .concat(id).concat("?");
    return as( beanFactory._.getRemoteBean(
            ContentSyncHelperImpl.#addUniqueIdent(
                    ContentSyncHelperImpl.#addExclusions(url,
                            ExcludeListRadioGroupBase.CONTENT_TYPE_EXCLUDE,
                            modelBean)
            )
    ),  ContentSyncModel);
  }

  static #addUniqueIdent(url:string):string{
    var num = Base64.encode(new Date().toString());
    return (url.indexOf("?")>-1 ? url.concat("&") : url.concat("?")).concat("_uq=").concat(num);
  }

  static #addExclusions(url:string, modelProp:string, modelBean:Bean):string {
    var contentTypeExclusions:Array<any> = modelBean.get(modelProp) || [];
    return url.concat(modelProp)
            .concat("=")
            .concat(contentTypeExclusions.join(","));
  }

  startWorkflow(modelBean:Bean):void {
    var css:ContentSyncSettings = modelBean.get(ContentSyncConstants.SELECTED_ENVIRONMENT_SETTING);
    var selectedSync:string = modelBean.get(ContentSyncConstants.SELECTED_SYNC_MODE);
    var allContents:Array<any> = modelBean.get(ContentSyncConstants.CONTENT_LIST_BEAN_PROPERTY);
    var url = ContentSyncHelperImpl.#CS_BASE_URL
            .concat(css.identifier)
            .concat("/startworkflow/")
            .concat(selectedSync);

    var remoteServiceMethod = new RemoteServiceMethod(url, "POST", true, true);
    remoteServiceMethod.request({
      remoteSyncIds: allContents.map((item:FolderTreeNode) => 
         item.data.id
      )
    }, (ok):void => 
      trace("[ContentSyncHelper] started workflow for " + selectedSync + " " + css.identifier)
    );


  }

  getContentSyncSettings():Deferred {
    var def = new Deferred();

    editorContext._.getSession().getConnection().getContentRepository()
            .getChild(ContentSyncHelperImpl.#CS_SETTING_LOCATION, (setting:Content):void => {
              if (!setting) {
                def.resolve([]);
                return;
              }
              as(setting.getProperties()
                      .get(ContentSyncHelperImpl.#CM_SETTINGS_SETTINGS_PROP),  RemoteBean).load((baseStruct:Struct):void => {
                var envList:Array<any> = baseStruct.get(ContentSyncHelperImpl.#ENVIRONMENTS);
                var propertyExcludes:Array<any> = baseStruct.get(ContentSyncHelperImpl.#PROPERTY_EXCLUDES);
                var contentTypeExcludes:Array<any> = baseStruct.get(ContentSyncHelperImpl.#CONTENT_TYPE_EXCLUDES);
                if (!envList) {
                  def.resolve([]);
                }
                def.resolve(envList.map((item:Struct):ContentSyncSettings => 
                   new ContentSyncSettings(item, propertyExcludes, contentTypeExcludes, "1")
                ));
              });
            });
    return def;
  }

  getRunningInstances():Deferred {
    var def = new Deferred();
    var remoteBean = beanFactory._.getRemoteBean(ContentSyncHelperImpl.#CS_BASE_URL
            .concat(ContentSyncHelperImpl.#NO_IDENT)
            .concat(ContentSyncHelperImpl.#CS_WFS_RUNNING)
            .concat("?_ds="+new Date().time));
    if (!remoteBean.isLoaded()) {
      remoteBean.load((data:RemoteBean):void => {
        var dataArray:Array<any> = data.get("items");
        var runningInstances =dataArray;

        def.resolve(runningInstances.map((item:any) =>{
          item.name = ContentSyncPluginResources_properties[item.name.concat("_Name")];
          return item;
        }) || []);
      });
    }
    return def;
  }

  getReferencesFor(ident:string, id:string, recursion:number, modelBean:Bean):Deferred {
    var def = new Deferred();
    var url = ContentSyncHelperImpl.#CS_BASE_URL
            .concat(ident)
            .concat(ContentSyncHelperImpl.#REFERENCES)
            .concat(id)
            .concat("/")
            .concat(recursion)
            .concat("?");
    url = ContentSyncHelperImpl.#addExclusions(url,ExcludeListRadioGroupBase.PROPERTY_EXCLUDE,modelBean).concat("&");
    url = ContentSyncHelperImpl.#addExclusions(url,ExcludeListRadioGroupBase.CONTENT_TYPE_EXCLUDE,modelBean);
    var remoteBean:RemoteBean =as( beanFactory._.getRemoteBean(url),  ContentSyncReferenceModel);
    remoteBean.load((bean:ContentSyncReferenceModel):void => 
      def.resolve(bean)
    );
    return def;
  }

  contentSyncModel2FolderTreeNode(csm:ContentSyncModel, parent:FolderTreeNode):FolderTreeNode {
    var id = csm.getContentId();
    var node = new FolderTreeNode({
      id: id.toString(),
      text: csm.getName(),
      leaf: true,
      iconCls: "content-type-xs " + ContentLocalizationUtil.getIconStyleClassForContentTypeName(csm.getType())
    });
    node.parentNode = parent;
    return node;
  }

  abortWorkflow(id:string):void{
    beanFactory._.getRemoteBean(
            ContentSyncHelperImpl.#CS_BASE_URL
                    .concat(ContentSyncHelperImpl.#NO_IDENT)
                    .concat(ContentSyncHelperImpl.#CS_WFS_ABORT)
                    .concat(id)
    ).load();
  }

  synchronizeContentList(model:Bean, origFnArr:Array<any>):void {
    var oldValue:Array<any> = model.get(ContentSyncConstants.CONTENT_LIST_BEAN_PROPERTY);
    var newContentListValue = oldValue;
    origFnArr.forEach((entry:FolderTreeNode):void =>{
      newContentListValue = newContentListValue.filter((item:FolderTreeNode):boolean => 
         item.data.id !== entry.data.id
      );
    });
    model.set(ContentSyncConstants.CONTENT_LIST_BEAN_PROPERTY, newContentListValue);
  }
}
mixin(ContentSyncHelperImpl, IContentSyncHelper);

export default ContentSyncHelperImpl;
