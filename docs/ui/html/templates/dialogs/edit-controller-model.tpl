<!-- .tpl prevents Live Server from injecting reload scripts into fetched partials. -->
<!-- Handoff: 编辑仅改展示信息与料号（PUT /api/v1/hn-models/... 的展示字段）；model_code / 类型 / vendor_id / product_code 只读；状态改停用走「冻结」。 -->
<dialog class="modal modal--wide" id="edit-controller-model-dialog" aria-labelledby="edit-controller-model-title">
  <form method="dialog" data-edit-model-form>
    <header class="modal__header">
      <div>
        <h2 id="edit-controller-model-title">编辑型号</h2>
        <p>编号 <span class="mono" data-edit-model-code>—</span>（只读）。仅编辑展示信息与料号。</p>
      </div>
      <button class="icon-button modal__close" value="cancel" formnovalidate aria-label="关闭" title="关闭"><svg class="app-icon app-icon--line" aria-hidden="true"><use href="icons.svg#icon-x"></use></svg></button>
    </header>
    <div class="modal__body form-grid">
      <label class="form-field"><span>型号名称</span><input name="model_name" data-edit-model-name required></label>
      <label class="form-field"><span>料号</span><input name="part_number" class="mono" data-edit-model-part required></label>

      <div class="form-field"><label>型号图片</label><span class="picker-field"><input data-edit-model-avatar-name placeholder="未上传" readonly><button class="button button--secondary button--sm" type="button" data-action="pick-edit-model-avatar">上传图片</button></span></div>
      <label class="form-field"><span>资料链接</span><input name="url" type="url" data-edit-model-url placeholder="选填"></label>

      <label class="form-field form-field--full"><span>型号描述</span><input name="desc" data-edit-model-desc placeholder="型号说明（选填）"></label>
    </div>
    <footer class="modal__footer"><button class="button button--secondary" value="cancel" formnovalidate>取消</button><button class="button button--primary" value="confirm">保存</button></footer>
  </form>
</dialog>
