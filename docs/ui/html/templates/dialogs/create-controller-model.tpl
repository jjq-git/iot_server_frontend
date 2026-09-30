<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: 新建型号 = 建 hn_models 骨架 + 首个硬件版本。填 类型 + 料号编号(4位HEX) + 产品名称 + 硬件版本；model_code/part_number/product_code 由 类型+编号 自动生成。vendor_id 固定 0x44454E47（ASCII DENG），创建时自动写入，不在表单。 -->
<!-- Handoff: 🔴 后端当前禁止空壳建型号（要求首版走 /firmwares/upload 事务）；本弹窗按"先建骨架 + 首个硬件版本"目标流程呈现，骨架落库方式待后端定。建好后在详情里加 OD → 上传固件 JSON。 -->
<dialog class="modal modal--wide" id="create-controller-model-dialog" aria-labelledby="create-controller-model-title">
  <form method="dialog" data-create-model-form>
    <header class="modal__header">
      <div>
        <h2 id="create-controller-model-title">新建型号</h2>
        <p>建型号 + 首个硬件版本；之后在详情里加 OD 并上传对应固件。</p>
      </div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <input type="hidden" name="vendor_id" value="0x44454E47">

      <div class="form-field"><label for="create-model-part">料号</label><span class="domain-field"><span class="domain-field__prefix mono" data-part-prefix>WF2D-</span><input id="create-model-part" class="mono" data-part-code placeholder="4 位 HEX，如 0050" pattern="[0-9A-Fa-f]{4}" required></span><small class="form-help">WF2Device 的编号。</small></div>
      <label class="form-field"><span>类型</span><select name="model_type" data-model-type required><option value="product">主机产品（Product）</option><option value="node">节点（Node）</option></select><small class="form-help">主机定制，节点通用。</small></label>

      <label class="form-field"><span>产品名称</span><input name="model_name" placeholder="型号展示名称" required><small class="form-help">需与 Configs 中的产品名称一致。</small></label>
      <label class="form-field"><span>硬件版本</span><input name="hw_version" class="mono" placeholder="如 V1.0.0" required><small class="form-help">新建型号同时建首个硬件版本。</small></label>

      <label class="form-field"><span>产品型号</span><input name="model_code" class="mono" data-model-code readonly placeholder="自动生成"><small class="form-help">由 类型 + 料号编号 自动生成，不可改。</small></label>
      <label class="form-field"><span>Product Code</span><input name="product_code" class="mono" data-product-code readonly placeholder="自动生成"><small class="form-help">自动生成；须对应设备上报的 <span class="mono">0x1018:02</span>。</small></label>

      <div class="form-field"><label>型号图片</label><span class="picker-field"><input data-model-avatar-name placeholder="未上传" readonly><button class="button button--secondary button--sm" type="button" data-action="pick-model-avatar">上传图片</button></span></div>
      <label class="form-field"><span>资料链接</span><input name="url" type="url" placeholder="选填"></label>

      <label class="form-field form-field--full"><span>型号描述</span><input name="desc" placeholder="型号说明（选填）"></label>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">创建</button></footer>
  </form>
</dialog>
