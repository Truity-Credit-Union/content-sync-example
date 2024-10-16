import Config from "@jangaroo/runtime/Config";
import ExcludeListRadioGroupBase from "./ExcludeListRadioGroupBase";
import ConfigUtils from "@jangaroo/runtime/ConfigUtils";
interface ExcludeListRadioGroupConfig extends Config<ExcludeListRadioGroupBase> {
}


class ExcludeListRadioGroup extends ExcludeListRadioGroupBase{
  declare Config: ExcludeListRadioGroupConfig;

  static override readonly xtype:string = "com.coremedia.blueprint.contentsync.studio.component.exludeListRadioGroup";

  constructor(config:Config<ExcludeListRadioGroup> = null){
    super( ConfigUtils.apply(Config(ExcludeListRadioGroup, {
  items:[
  ]
}),config));
  }}
export default ExcludeListRadioGroup;
