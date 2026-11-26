<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="130px"
    >
      <el-form-item label="供应商名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入供应商名称" />
      </el-form-item>
      <el-form-item label="供应商编码" prop="code">
        <el-input v-model="formData.code" placeholder="如 openai / qwen / deepseek / ollama" />
      </el-form-item>
      <el-form-item label="API 基础地址" prop="baseUrl">
        <el-input v-model="formData.baseUrl" placeholder="如 https://api.openai.com/v1" />
      </el-form-item>
      <el-form-item label="API Key" prop="apiKey">
        <el-input
          v-model="formData.apiKey"
          type="password"
          show-password
          :placeholder="
            formType === 'update'
              ? '留空表示不修改已保存的密钥'
              : '请输入 API Key（加密存储，接口不回显）'
          "
        />
      </el-form-item>
      <el-form-item label="备用凭证" prop="apiSecret">
        <el-input
          v-model="formData.apiSecret"
          type="password"
          show-password
          placeholder="Azure / 阿里云等需要，留空表示不修改"
        />
      </el-form-item>
      <el-form-item label="自定义请求头" prop="headers">
        <el-input v-model="formData.headers" type="textarea" :rows="2" placeholder="JSON 字符串" />
      </el-form-item>
      <el-form-item label="代理地址" prop="proxyUrl">
        <el-input v-model="formData.proxyUrl" placeholder="请输入代理地址" />
      </el-form-item>
      <el-form-item label="每日 Token 上限" prop="dailyTokenLimit">
        <el-input-number
          v-model="formData.dailyTokenLimit"
          :min="0"
          controls-position="right"
          class="!w-full"
        />
        <span class="ml-8px text-12px text-gray-400">0 表示不限</span>
      </el-form-item>
      <el-form-item label="月度预算（元）" prop="monthlyBudget">
        <el-input-number
          v-model="formData.monthlyBudget"
          :min="0"
          :precision="2"
          controls-position="right"
          class="!w-full"
        />
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
import { COMMON_STATUS } from '@/api/dataQuery/constants'
import * as ProviderApi from '@/api/dataQuery/model/provider'

defineOptions({ name: 'DataQueryModelProviderForm' })

const { t } = useI18n()
const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('')
const formLoading = ref(false)
const formType = ref('')
const formRef = ref()

const defaultForm = (): ProviderApi.AiModelProviderVO => ({
  id: undefined,
  name: '',
  code: '',
  protocol: 'OPENAI',
  baseUrl: '',
  apiKey: '',
  apiSecret: '',
  headers: '',
  proxyUrl: '',
  dailyTokenLimit: 0,
  monthlyBudget: 0,
  status: 0,
  sort: 0,
  remark: '',
  createTime: ''
})
const formData = ref<ProviderApi.AiModelProviderVO>(defaultForm())

const formRules = reactive({
  name: [{ required: true, message: '供应商名称不能为空', trigger: 'blur' }],
  code: [{ required: true, message: '供应商编码不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  formData.value = defaultForm()
  formRef.value?.resetFields()
  if (id) {
    formLoading.value = true
    try {
      const data = await ProviderApi.getAiModelProvider(id)
      // 后端 RespVO 不回显密钥，编辑时留空即表示不修改
      formData.value = { ...defaultForm(), ...data, apiKey: '', apiSecret: '' }
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
  formLoading.value = true
  try {
    const data = formData.value
    if (formType.value === 'create') {
      await ProviderApi.createAiModelProvider(data)
      message.success(t('common.createSuccess'))
    } else {
      await ProviderApi.updateAiModelProvider(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
