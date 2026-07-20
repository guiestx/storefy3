<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';

import { Alert, Button, Card, Col, Input, Row, Space, Statistic, Table, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getCurrentOrganizationId, supabase } from '#/lib/supabase';

defineOptions({ name: 'StorefyInventoryBalances' });

const loading = ref(false);
const errorMessage = ref('');
const search = ref('');
const rows = ref<any[]>([]);

const columns: TableColumnsType = [
  { dataIndex: 'product_name', key: 'product_name', title: 'Produto', width: 380 },
  { dataIndex: 'sku', key: 'sku', title: 'SKU', width: 130 },
  { dataIndex: 'warehouse_name', key: 'warehouse_name', title: 'Depósito', width: 180 },
  { dataIndex: 'on_hand', key: 'on_hand', title: 'Físico', width: 100 },
  { dataIndex: 'reserved', key: 'reserved', title: 'Reservado', width: 110 },
  { dataIndex: 'available', key: 'available', title: 'Disponível', width: 110 },
  { dataIndex: 'updated_at', key: 'updated_at', title: 'Atualizado', width: 170 },
];

const normalizedRows = computed(() =>
  rows.value.map((balance) => {
    const variant = Array.isArray(balance.product_variants)
      ? balance.product_variants[0]
      : balance.product_variants;
    const product = Array.isArray(variant?.products)
      ? variant?.products[0]
      : variant?.products;
    const warehouse = Array.isArray(balance.warehouses)
      ? balance.warehouses[0]
      : balance.warehouses;

    return {
      ...balance,
      brand_name: product?.brand_name,
      product_name: product?.name || variant?.name || 'Produto sem identificação',
      sku: variant?.sku,
      warehouse_code: warehouse?.code,
      warehouse_name: warehouse?.name || warehouse?.code || '—',
    };
  }),
);

const filteredRows = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('pt-BR');
  if (!term) return normalizedRows.value;

  return normalizedRows.value.filter((row) =>
    [row.product_name, row.brand_name, row.sku, row.warehouse_name, row.warehouse_code]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase('pt-BR').includes(term)),
  );
});

const totals = computed(() =>
  normalizedRows.value.reduce(
    (result, row) => {
      result.onHand += Number(row.on_hand ?? 0);
      result.reserved += Number(row.reserved ?? 0);
      result.available += Number(row.available ?? 0);
      return result;
    },
    { available: 0, onHand: 0, reserved: 0 },
  ),
);

async function loadInventory() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const organizationId = await getCurrentOrganizationId();
    const { data, error } = await supabase
      .from('inventory_balances')
      .select(
        'id,on_hand,reserved,available,updated_at,product_variants(id,name,sku,products(id,name,brand_name)),warehouses(id,code,name)',
      )
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) throw error;
    rows.value = data ?? [];
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Não foi possível carregar o estoque.';
  } finally {
    loading.value = false;
  }
}

onMounted(loadInventory);
</script>

<template>
  <div class="p-4 md:p-5">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Estoque</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Posição física, reservas e disponibilidade por depósito.
        </p>
      </div>
      <Button :loading="loading" @click="loadInventory">Atualizar</Button>
    </div>

    <Alert
      v-if="errorMessage"
      class="mb-4"
      closable
      message="Falha ao carregar estoque"
      :description="errorMessage"
      type="error"
    />

    <Row :gutter="[16, 16]" class="mb-4">
      <Col :xs="24" :md="8">
        <Card :bordered="false"><Statistic title="Estoque físico" :value="totals.onHand" /></Card>
      </Col>
      <Col :xs="24" :md="8">
        <Card :bordered="false"><Statistic title="Reservado" :value="totals.reserved" /></Card>
      </Col>
      <Col :xs="24" :md="8">
        <Card :bordered="false"><Statistic title="Disponível" :value="totals.available" /></Card>
      </Col>
    </Row>

    <Card :bordered="false">
      <Space class="mb-4 w-full" wrap>
        <Input
          v-model:value="search"
          allow-clear
          placeholder="Buscar produto, SKU ou depósito"
          style="min-width: 320px"
        />
        <Tag color="blue">{{ filteredRows.length }} saldos</Tag>
      </Space>

      <Table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 25, showSizeChanger: true }"
        row-key="id"
        :scroll="{ x: 1100 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'product_name'">
            <div>
              <p class="font-medium">{{ record.product_name }}</p>
              <p v-if="record.brand_name" class="mt-0.5 text-xs text-muted-foreground">
                {{ record.brand_name }}
              </p>
            </div>
          </template>
          <template v-else-if="column.key === 'sku'">
            <span class="font-mono">{{ record.sku || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'warehouse_name'">
            <Tag>{{ record.warehouse_code || 'DEP' }}</Tag>
            {{ record.warehouse_name }}
          </template>
          <template v-else-if="column.key === 'on_hand'">
            <strong>{{ Number(record.on_hand ?? 0) }}</strong>
          </template>
          <template v-else-if="column.key === 'reserved'">
            <Tag :color="Number(record.reserved ?? 0) > 0 ? 'orange' : 'default'">
              {{ Number(record.reserved ?? 0) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'available'">
            <Tag :color="Number(record.available ?? 0) > 0 ? 'green' : 'red'">
              {{ Number(record.available ?? 0) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'updated_at'">
            {{ dayjs(record.updated_at).format('DD/MM/YYYY HH:mm') }}
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
