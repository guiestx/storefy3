<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';

import { Alert, Button, Card, Input, Space, Table, Tag } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getCurrentOrganizationId, supabase } from '#/lib/supabase';

defineOptions({ name: 'StorefyOrders' });

const loading = ref(false);
const errorMessage = ref('');
const search = ref('');
const rows = ref<any[]>([]);

const columns: TableColumnsType = [
  { dataIndex: 'code', key: 'code', title: 'Pedido', width: 160 },
  { dataIndex: 'status', key: 'status', title: 'Status', width: 170 },
  {
    dataIndex: 'payment_status',
    key: 'payment_status',
    title: 'Pagamento',
    width: 140,
  },
  { dataIndex: 'channel', key: 'channel', title: 'Canal', width: 110 },
  { dataIndex: 'total', key: 'total', title: 'Total', width: 140 },
  { dataIndex: 'created_at', key: 'created_at', title: 'Data', width: 170 },
];

const filteredRows = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('pt-BR');
  if (!term) return rows.value;

  return rows.value.filter((row) =>
    [row.code, row.status, row.payment_status, row.channel]
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

function statusColor(status?: string) {
  const colors: Record<string, string> = {
    awaiting_payment: 'orange',
    cancelled: 'red',
    paid: 'green',
    pending: 'orange',
    picking: 'blue',
    reserved: 'geekblue',
    shipped: 'cyan',
  };
  return colors[status ?? ''] ?? 'default';
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    awaiting_payment: 'Aguardando pagamento',
    cancelled: 'Cancelado',
    paid: 'Pago',
    pending: 'Pendente',
    picking: 'Separação',
    reserved: 'Reservado',
    shipped: 'Enviado',
  };
  return labels[status ?? ''] ?? status ?? '—';
}

async function loadOrders() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const organizationId = await getCurrentOrganizationId();
    const { data, error } = await supabase
      .from('sales_orders')
      .select('id,code,status,payment_status,channel,total,created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    rows.value = data ?? [];
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Não foi possível carregar os pedidos.';
  } finally {
    loading.value = false;
  }
}

onMounted(loadOrders);
</script>

<template>
  <div class="p-4 md:p-5">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Acompanhe reservas, pagamentos e expedição.
        </p>
      </div>
      <Button :loading="loading" @click="loadOrders">Atualizar</Button>
    </div>

    <Alert
      v-if="errorMessage"
      class="mb-4"
      closable
      message="Falha ao carregar pedidos"
      :description="errorMessage"
      type="error"
    />

    <Card :bordered="false">
      <Space class="mb-4 w-full" wrap>
        <Input
          v-model:value="search"
          allow-clear
          placeholder="Buscar por pedido, status ou canal"
          style="min-width: 320px"
        />
        <Tag color="blue">{{ filteredRows.length }} pedidos</Tag>
      </Space>

      <Table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        row-key="id"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'">
            <span class="font-mono font-medium">{{ record.code || record.id }}</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</Tag>
          </template>
          <template v-else-if="column.key === 'payment_status'">
            <Tag :color="statusColor(record.payment_status)">
              {{ statusLabel(record.payment_status) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'total'">
            <strong>{{ formatMoney(record.total) }}</strong>
          </template>
          <template v-else-if="column.key === 'created_at'">
            {{ dayjs(record.created_at).format('DD/MM/YYYY HH:mm') }}
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
