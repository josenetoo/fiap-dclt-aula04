# ☸️ Setup Cluster EKS para GitOps Lab

**Cluster**: cicd-lab  
**Profile AWS**: fiapaws  
**Região**: us-east-1  
**Compatível com**: AWS Learner Lab  

---

## 📋 Pré-requisitos

### Passo 1: Verificar Ferramentas

```bash
# Verificar AWS CLI
aws --version

# Verificar credenciais
aws sts get-caller-identity --profile fiapaws

# Verificar kubectl
kubectl version --client

# Verificar eksctl (opcional, mas recomendado)
eksctl version
```

---

## 🔍 Passo 2: Discovery de Subnets

```bash
# Listar todas as subnets públicas disponíveis
aws ec2 describe-subnets \
  --profile fiapaws \
  --region us-east-1 \
  --filters "Name=map-public-ip-on-launch,Values=true" \
  --query 'Subnets[*].[SubnetId,AvailabilityZone,CidrBlock]' \
  --output table

# Filtrar apenas subnets em AZs suportadas pelo EKS
# (excluindo us-east-1e que pode ter limitações)
aws ec2 describe-subnets \
  --profile fiapaws \
  --region us-east-1 \
  --filters "Name=map-public-ip-on-launch,Values=true" \
  --query 'Subnets[?AvailabilityZone!=`us-east-1e`].[SubnetId,AvailabilityZone,CidrBlock]' \
  --output table
```

---

## ☸️ Passo 3: Criar Cluster EKS

### Opção A: Usando AWS CLI (Discovery Automático)

```bash
# Obter Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --profile fiapaws --query Account --output text)

# Discovery automático de subnets (excluindo us-east-1e)
SUBNET_IDS=$(aws ec2 describe-subnets \
  --profile fiapaws \
  --region us-east-1 \
  --filters "Name=map-public-ip-on-launch,Values=true" \
  --query 'Subnets[?AvailabilityZone!=`us-east-1e`].SubnetId' \
  --output text | tr '\t' ',')

echo "Subnets descobertas: $SUBNET_IDS"

# Criar cluster EKS
aws eks create-cluster \
  --name cicd-lab \
  --region us-east-1 \
  --role-arn arn:aws:iam::${ACCOUNT_ID}:role/LabRole \
  --resources-vpc-config subnetIds=${SUBNET_IDS} \
  --profile fiapaws

# Aguardar cluster ficar ativo (15-20 minutos)
echo "⏳ Aguardando cluster ficar ativo (isso pode levar 15-20 minutos)..."
aws eks wait cluster-active \
  --name cicd-lab \
  --region us-east-1 \
  --profile fiapaws

echo "✅ Cluster criado com sucesso!"
```

### Opção B: Usando eksctl (Recomendado)

```bash
# Criar cluster com eksctl
eksctl create cluster \
  --name cicd-lab \
  --region us-east-1 \
  --profile fiapaws \
  --nodegroup-name workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 2 \
  --nodes-max 2 \
  --managed \
  --with-oidc

# O eksctl faz o discovery automático de subnets
# e cria o cluster + node group em um único comando
```

---

## 🖥️ Passo 4: Criar Node Group

**Nota**: Se você usou eksctl (Opção B), o node group já foi criado. Pule para o Passo 5.

```bash
# Obter Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --profile fiapaws --query Account --output text)

# Discovery de subnets para node group
SUBNET_IDS=$(aws ec2 describe-subnets \
  --profile fiapaws \
  --region us-east-1 \
  --filters "Name=map-public-ip-on-launch,Values=true" \
  --query 'Subnets[?AvailabilityZone!=`us-east-1e`].SubnetId' \
  --output text)

echo "Subnets para node group: $SUBNET_IDS"

# Criar node group
aws eks create-nodegroup \
  --cluster-name cicd-lab \
  --nodegroup-name workers \
  --node-role arn:aws:iam::${ACCOUNT_ID}:role/LabRole \
  --subnets $SUBNET_IDS \
  --instance-types t3.medium \
  --scaling-config minSize=2,maxSize=2,desiredSize=2 \
  --region us-east-1 \
  --profile fiapaws

# Aguardar node group ficar ativo
echo "⏳ Aguardando node group ficar ativo..."
aws eks wait nodegroup-active \
  --cluster-name cicd-lab \
  --nodegroup-name workers \
  --region us-east-1 \
  --profile fiapaws

echo "✅ Node group criado com sucesso!"
```

---

## ⚙️ Passo 5: Configurar kubectl

```bash
# Configurar acesso ao cluster
aws eks update-kubeconfig \
  --name cicd-lab \
  --region us-east-1 \
  --profile fiapaws

# Verificar contexto
kubectl config current-context

# Verificar nodes
kubectl get nodes

# Verificar pods do sistema
kubectl get pods -n kube-system
```

---

## ✅ Passo 6: Validar Cluster

```bash
# Verificar informações do cluster
aws eks describe-cluster \
  --name cicd-lab \
  --region us-east-1 \
  --profile fiapaws \
  --query 'cluster.[name,status,version,endpoint]' \
  --output table

# Verificar node group
aws eks describe-nodegroup \
  --cluster-name cicd-lab \
  --nodegroup-name workers \
  --region us-east-1 \
  --profile fiapaws \
  --query 'nodegroup.[nodegroupName,status,instanceTypes,scalingConfig]' \
  --output table

# Testar deploy simples
kubectl create deployment nginx --image=nginx:latest
kubectl expose deployment nginx --port=80 --type=ClusterIP
kubectl get pods
kubectl delete deployment nginx
kubectl delete service nginx
```

---

## 🔧 Troubleshooting

### Problema: Erro ao criar cluster em AZ específica

```bash
# Verificar AZs disponíveis para EKS
aws ec2 describe-availability-zones \
  --profile fiapaws \
  --region us-east-1 \
  --filters "Name=state,Values=available" \
  --query 'AvailabilityZones[*].[ZoneName,State]' \
  --output table

# Listar subnets por AZ
aws ec2 describe-subnets \
  --profile fiapaws \
  --region us-east-1 \
  --query 'Subnets[*].[SubnetId,AvailabilityZone,MapPublicIpOnLaunch]' \
  --output table
```

### Problema: Node group não inicia

```bash
# Verificar logs do node group
aws eks describe-nodegroup \
  --cluster-name cicd-lab \
  --nodegroup-name workers \
  --region us-east-1 \
  --profile fiapaws

# Verificar se há instâncias EC2
aws ec2 describe-instances \
  --profile fiapaws \
  --region us-east-1 \
  --filters "Name=tag:eks:cluster-name,Values=cicd-lab" \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,InstanceType]' \
  --output table
```

### Problema: kubectl não conecta

```bash
# Reconfigurar kubeconfig
aws eks update-kubeconfig \
  --name cicd-lab \
  --region us-east-1 \
  --profile fiapaws \
  --alias cicd-lab

# Verificar configuração
kubectl config view

# Testar conexão
kubectl cluster-info
```

---

## 🧹 Passo 7: Limpeza (quando terminar)

```bash
# Deletar node group primeiro
aws eks delete-nodegroup \
  --cluster-name cicd-lab \
  --nodegroup-name workers \
  --region us-east-1 \
  --profile fiapaws

# Aguardar node group ser deletado
aws eks wait nodegroup-deleted \
  --cluster-name cicd-lab \
  --nodegroup-name workers \
  --region us-east-1 \
  --profile fiapaws

# Deletar cluster
aws eks delete-cluster \
  --name cicd-lab \
  --region us-east-1 \
  --profile fiapaws

# Aguardar cluster ser deletado
aws eks wait cluster-deleted \
  --name cicd-lab \
  --region us-east-1 \
  --profile fiapaws

echo "✅ Cluster deletado com sucesso!"
```

### Usando eksctl para limpeza

```bash
# Deletar cluster (deleta node group automaticamente)
eksctl delete cluster \
  --name cicd-lab \
  --region us-east-1 \
  --profile fiapaws
```

---

## 📝 Notas Importantes

### Limitações do AWS Learner Lab

- ✅ **Regiões suportadas**: us-east-1, us-west-2
- ✅ **Instance types**: t3.medium recomendado
- ✅ **Nodes**: Máximo 2 nodes (limite de 9 instâncias EC2 concorrentes)
- ⚠️ **AZ us-east-1e**: Pode ter limitações, evite usar
- ⚠️ **Budget**: Monitore custos, desligue quando não usar
- ✅ **LabRole**: Usar para cluster e node group

### Boas Práticas

1. **Use eksctl quando possível** - Simplifica muito o processo
2. **Discovery automático** - Deixe o script descobrir subnets disponíveis
3. **Evite AZs problemáticas** - Filtre us-east-1e
4. **Monitore custos** - Delete recursos quando não estiver usando
5. **Profile AWS** - Sempre use `--profile fiapaws`

### Comandos Úteis

```bash
# Ver todos os clusters
aws eks list-clusters --region us-east-1 --profile fiapaws

# Ver detalhes do cluster
aws eks describe-cluster --name cicd-lab --region us-east-1 --profile fiapaws

# Ver node groups
aws eks list-nodegroups --cluster-name cicd-lab --region us-east-1 --profile fiapaws

# Ver logs do cluster
aws eks describe-cluster --name cicd-lab --region us-east-1 --profile fiapaws --query 'cluster.logging'

# Atualizar versão do cluster (se necessário)
aws eks update-cluster-version --name cicd-lab --kubernetes-version 1.28 --region us-east-1 --profile fiapaws
```

---

**Pronto!** Seu cluster EKS está configurado e pronto para os labs de GitOps! 🚀
