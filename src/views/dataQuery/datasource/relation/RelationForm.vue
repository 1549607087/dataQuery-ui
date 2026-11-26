<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="760px">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="150px"
    >
      <el-divider content-position="left">关联表</el-divider>
      <el-form-item label="数据源" prop="datasourceId">
        <el-select
          v-model="formData.datasourceId"
          placeholder="请选择数据源"
          filterable
          class="!w-full"
          @change="handleDatasourceChange"
        >
          <el-option
            v-for="item in datasourceOptions"
            :key="item.id"
            :label="`${item.name} (${item.code})`"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="左表" prop="leftTableId">
        <el-select
          v-model="formData.leftTableId"
          placeholder="请选择左表"
          filterable
          class="!w-full"
          @change="handleTableChange('left', $event)"
        >
          <el-option
            v-for="item in tableOptions"
            :key="item.id"
            :label="item.tableName"
            :value="item.id!"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="右表" prop="rightTableId">
        <el-select
          v-model="formData.rightTableId"
          placeholder="请选择右表"
          filterable
          class="!w-full"
          @change="handleTableChange('right', $event)"
        >
          <el-option
            v-for="item in tableOptions"
            :key="item.id"
            :label="item.tableName"
            :value="item.id!"
          />
        </el-select>
      </el-form-item>

      <el-divider content-position="left">Join 规则</el-divider>
      <el-form-item label="连接类型" prop="joinType">
        <el-select v-model="formData.joinType" placeholder="请选择连接类型" class="!w-full">
          <el-option
            v-for="item in JOIN_TYPE_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="连接字段对" prop="joinPairs">
        <div class="join-pairs">
          <div v-for="(pair, index) in joinPairRows" :key="index" class="join-pair-row">
            <el-select
              v-model="pair.left"
              placeholder="左表字段"
              filterable
              allow-create
              clearable
              class="!w-180px"
              @change="markJoinPairsEdited"
            >
              <el-option
                v-for="column in leftColumns"
                :key="column.columnName"
                :label="columnLabel(column)"
                :value="column.columnName"
              />
            </el-select>
            <span class="join-pair-equal">=</span>
            <el-select
              v-model="pair.right"
              placeholder="右表字段"
              filterable
              allow-create
              clearable
              class="!w-180px"
              @change="markJoinPairsEdited"
            >
              <el-option
                v-for="column in rightColumns"
                :key="column.columnName"
                :label="columnLabel(column)"
                :value="column.columnName"
              />
            </el-select>
            <el-button
              link
              type="danger"
              class="!ml-4px"
              :title="`删除第 ${index + 1} 组字段对`"
              @click="removeJoinPair(index)"
            >
              <Icon icon="ep:delete" />
            </el-button>
          </div>
          <div v-if="!joinPairRows.length" class="join-pairs-empty">
            未配置字段对，JOIN 将不带 ON 条件
          </div>
          <el-button link type="primary" @click="addJoinPair">
            <Icon icon="ep:plus" class="mr-4px" />添加字段对
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="额外连接条件" prop="joinCondition">
        <el-input
          v-model="formData.joinCondition"
          type="textarea"
          :rows="2"
          placeholder="请输入额外连接条件"
        />
      </el-form-item>
      <el-form-item label="基数" prop="cardinality">
        <el-select v-model="formData.cardinality" placeholder="请选择基数" class="!w-full">
          <el-option
            v-for="item in CARDINALITY_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="代价" prop="cost">
        <el-input-number v-model="formData.cost" :min="0" controls-position="right" />
      </el-form-item>

      <el-divider content-position="left">其它</el-divider>
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="2"
          placeholder="请输入描述"
        />
      </el-form-item>
      <el-form-item label="来源" prop="source">
        <el-input-number v-model="formData.source" :min="0" controls-position="right" />
      </el-form-item>
      <el-form-item label="已验证" prop="verified">
        <el-radio-group v-model="formData.verified">
          <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{
            item.label
          }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="是否启用" prop="enabled">
        <el-radio-group v-model="formData.enabled">
          <el-radio v-for="item in YES_NO_OPTIONS" :key="item.value" :value="item.value">{{
            item.label
          }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio v-for="item in COMMON_STATUS" :key="item.value" :value="item.value">{{
            item.label
          }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="formData.sort" :min="0" controls-position="right" />
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import {
  CARDINALITY_OPTIONS,
  COMMON_STATUS,
  JOIN_TYPE_OPTIONS,
  YES_NO_OPTIONS
} from '@/api/dataQuery/constants'
import * as ColumnApi from '@/api/dataQuery/datasource/column'
import * as DatasourceApi from '@/api/dataQuery/datasource'
import * as RelationApi from '@/api/dataQuery/datasource/relation'
import * as TableApi from '@/api/dataQuery/datasource/table'

defineOptions({ name: 'DataQueryDatasourceRelationForm' })

/** 一组等值连接字段：left 列 = right 列 */
interface JoinPairRow {
  left: string
  right: string
}

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()
const datasourceOptions = ref<DatasourceApi.AiDatasourceSimpleRespVO[]>([])
const tableOptions = ref<TableApi.AiDatasourceTableVO[]>([])
const leftColumns = ref<ColumnApi.AiDatasourceColumnVO[]>([])
const rightColumns = ref<ColumnApi.AiDatasourceColumnVO[]>([])
const joinPairRows = ref<JoinPairRow[]>([])
/** 兼容历史非标准 JSON：无法还原成字段对时，不替用户静默清空 */
const originalJoinPairs = ref('')
const joinPairsParsed = ref(true)

const defaultForm = (): RelationApi.AiDatasourceTableRelationVO => ({
  id: undefined,
  datasourceId: undefined,
  leftTableId: undefined,
  rightTableId: undefined,
  // 左右表物理名由后端按表 ID 回填，前端仅用于列表展示，不提交
  leftTableName: '',
  rightTableName: '',
  joinType: 1,
  joinPairs: '',
  joinCondition: '',
  cardinality: 2,
  cost: 0,
  description: '',
  source: 1,
  verified: 0,
  enabled: 1,
  status: 0,
  sort: 0,
  remark: ''
})
const formData = ref<RelationApi.AiDatasourceTableRelationVO>(defaultForm())

const formRules = reactive({
  datasourceId: [{ required: true, message: '数据源不能为空', trigger: 'change' }],
  leftTableId: [{ required: true, message: '左表不能为空', trigger: 'change' }],
  rightTableId: [{ required: true, message: '右表不能为空', trigger: 'change' }],
  joinType: [{ required: true, message: '连接类型不能为空', trigger: 'change' }]
})

const columnLabel = (column: ColumnApi.AiDatasourceColumnVO) =>
  column.nameZh ? `${column.columnName}（${column.nameZh}）` : column.columnName

/** 用户改过字段对后，原始 JSON 不再需要兜底 */
const markJoinPairsEdited = () => {
  joinPairsParsed.value = true
}

/** 把已有 JSON 还原成可编辑的字段对；识别不了时不静默清空，提示用户重新选 */
const restoreJoinPairs = (raw: string) => {
  originalJoinPairs.value = raw || ''
  let rows: JoinPairRow[] = []
  let parsed = true
  try {
    const value = JSON.parse(raw || '[]')
    parsed = Array.isArray(value)
    if (Array.isArray(value)) {
      rows = value
        .filter((item) => item && typeof item === 'object')
        .map((item: Record<string, unknown>) => ({
          left: String(item.left ?? ''),
          right: String(item.right ?? '')
        }))
    }
  } catch {
    parsed = false
  }
  joinPairsParsed.value = parsed
  joinPairRows.value = rows.length ? rows : [{ left: '', right: '' }]
}

const addJoinPair = () => {
  joinPairRows.value.push({ left: '', right: '' })
  markJoinPairsEdited()
}

const removeJoinPair = (index: number) => {
  joinPairRows.value.splice(index, 1)
  markJoinPairsEdited()
}

const loadColumns = async (tableId: number | undefined, side: 'left' | 'right') => {
  const target = side === 'left' ? leftColumns : rightColumns
  target.value = tableId ? await ColumnApi.getAiDatasourceColumnListByTable(tableId) : []
}

/** 换表后旧字段不再适用，清空字段对重新选 */
const handleTableChange = async (side: 'left' | 'right', val: number) => {
  await loadColumns(val, side)
  joinPairRows.value = []
  markJoinPairsEdited()
}

const handleDatasourceChange = async (val: number) => {
  formData.value.leftTableId = undefined
  formData.value.rightTableId = undefined
  tableOptions.value = val ? await TableApi.getAiDatasourceTableListByDatasource(val) : []
  leftColumns.value = []
  rightColumns.value = []
  joinPairRows.value = []
  markJoinPairsEdited()
}

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  tableOptions.value = []
  leftColumns.value = []
  rightColumns.value = []
  restoreJoinPairs('')
  if (!datasourceOptions.value.length) {
    datasourceOptions.value = await DatasourceApi.getAiDatasourceSimpleList()
  }
  if (id) {
    formLoading.value = true
    try {
      formData.value = { ...defaultForm(), ...(await RelationApi.getAiDatasourceTableRelation(id)) }
      restoreJoinPairs(formData.value.joinPairs)
      if (formData.value.datasourceId) {
        tableOptions.value = await TableApi.getAiDatasourceTableListByDatasource(
          formData.value.datasourceId
        )
      }
      await Promise.all([
        loadColumns(formData.value.leftTableId, 'left'),
        loadColumns(formData.value.rightTableId, 'right')
      ])
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open })

const emit = defineEmits(['success'])
const submitForm = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return
  // 只填了一边的字段对拼不出 ON 条件，提前拦下，别让用户保存后才发现不生效
  if (
    joinPairRows.value.some((pair) => Boolean(pair.left?.trim()) !== Boolean(pair.right?.trim()))
  ) {
    message.error('每组字段对都要同时选择左表字段和右表字段')
    return
  }
  // 历史遗留的非标准 JSON 还原不成字段对，别在不提示的情况下把它清空
  if (!joinPairsParsed.value && originalJoinPairs.value) {
    message.error('原有连接字段对格式无法识别，请重新选择字段后再保存')
    return
  }
  formLoading.value = true
  try {
    // 只提交 SaveReqVO 字段；左右表名由后端按表 ID 回填，createTime 由后端维护
    // 字段对传结构化数组，JSON 由后端拼，前端不再负责序列化
    const joinPairs = joinPairRows.value
      .filter((pair) => pair.left?.trim() && pair.right?.trim())
      .map((pair) => ({ left: pair.left.trim(), right: pair.right.trim() }))
    const data: RelationApi.AiDatasourceTableRelationSaveVO = { ...formData.value, joinPairs }
    if (formType.value === 'create') {
      await RelationApi.createAiDatasourceTableRelation(data)
      message.success(t('common.createSuccess'))
    } else {
      await RelationApi.updateAiDatasourceTableRelation(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>

<style scoped>
.join-pairs {
  width: 100%;
}

.join-pair-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.join-pair-equal {
  margin: 0 6px;
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.join-pairs-empty {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
</style>
