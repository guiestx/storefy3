<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';

import { Alert, Button, Card, Input, Space, Table, Tag } from 'ant-design-vue';

import { getCurrentOrganizationId, supabase } from '#/lib/supabase';

defineOptions({ name: 'StorefyProducts' });

const loading = ref(false);
const errorMessage = ref('');
const search = ref('');
const rows = ref<any[]>([]);

const columns: TableColumnsType = [
  { dataIndex: 'name', key: 'name', title: 'Produto', width: 390 },
  { dataIndex: 'brand_name', key: 'brand_name', title: 'Marca', width: 150 },
  { dataIndex: 'sku', key: 'sku', title: 'SKU', width: 130 },
  { dataIndex: 'base_price', key: 'base_price', title: 'Preço', width: 130 },
  { dataIndex: 'status', key: 'status', title: 'Status', width: 120 },
];

const normalizedRows = computed(() =>
  rows.value.map((product) => {
    const variants = Array.isArray(product.product_variants)
      ? product.product_variants
      : [];
    const variant = variants[0] ?? {};

    return {
      ...product,
      base_price: variant.base_price,
      sku: variant.sku,
      variant_status: variant.status,
    };
  }),
);

const filteredRows = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('pt-BR');
  if (!term) return normalizedRows.value;

  return normalizedRows.value.filter((row) =>
    [row.name, row.brand_name, row.sku, row.status]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(term)),
  );
});

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  }).format(Number(value ?? 0));
}

async function loadProducts() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const organizationId = await getCurrentOrganizationId();
    const { data, error } = await supabase
      .from('products')
      .select(
        'id,name,brand_name,status,product_type,updated_at,product_variants(id,sku,base_price,cost_price,status)',
      )
      .eq('organization_id', organizationId)
      .order('name')
      .limit(500);

    if (error) throw error;
    rows.value = data ?? [];
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Não foi possível carregar os produtos.';
  } finally {
    loading.value = false;
  }
}

onMounted(loadProducts);
</script>

<template>
  <div class="p-4 md:p-5">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Produtos</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Catálogo integrado ao estoque e aos canais de venda.
        </p>
      </div>
      <Button :loading="loading" @click="loadProducts">Atualizar</Button>
    </div>

    <Alert
      v-if="errorMessage"
      class="mb-4"
      closable
      message="Falha ao carregar catálogo"
      :description="errorMessage"
      type="error"
    />

    <Card :bordered="false">
      <Space class="mb-4 w-full" wrap>
        <Input
          v-model:value="search"
          allow-clear
          placeholder="Buscar por produto, marca ou SKU"
          style="min-width: 320px"
        />
        <Tag color="blue">{{ filteredRows.length }} produtos carregados</Tag>
      </Space>

      <Table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 25, showSizeChanger: true }"
        row-key="id"
        :scroll="{ x: 920 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div>
              <p class="font-medium">{{ record.name }}</p>
              <p class="mt-0.5 text-xs text-muted-foreground">
                {{ record.product_type || 'Produto' }}
              </p>
            </div>
          </template>
          <template v-else-if="column.key === 'brand_name'">
            {{ record.brand_name || '—' }}
          </template>
          <template v-else-if="column.key === 'sku'">
            <span class="font-mono">{{ record.sku || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'base_price'">
            <strong>{{ formatMoney(record.base_price) }}</strong>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="record.status === 'active' ? 'green' : 'default'">
              {{ record.status === 'active' ? 'Ativo' : record.status }}
            </Tag>
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
