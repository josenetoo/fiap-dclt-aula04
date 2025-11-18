# 📚 Aula 04 - GitOps com ArgoCD e FluxCD

## 🎯 Objetivos

- Compreender os **princípios do GitOps** e diferenças entre push e pull model
- Instalar e configurar **ArgoCD** para deploy automático
- Instalar e configurar **FluxCD** como alternativa GitOps
- Implementar **pipeline CI/CD completo** com GitOps
- Comparar **ArgoCD vs FluxCD** e escolher a ferramenta adequada

## 🚀 Como Usar

### 1. Fork e Clone

```bash
git clone https://github.com/SEU_USUARIO/fiap-dclt-aula04.git
cd fiap-dclt-aula04
```

### 2. Pré-requisitos

**⚠️ IMPORTANTE**: Esta aula depende de aulas anteriores:

#### 📦 Cluster EKS (Aula 01)
O cluster EKS `cicd-lab` deve ter sido criado na **Aula 01**.

Se você ainda não criou o cluster:
1. Volte ao **repositório da Aula 01**
2. Siga os passos de criação do cluster EKS
3. O cluster deve ter o nome: `cicd-lab`
4. Região: `us-east-1`
5. Profile AWS: `fiapaws`

**Verificar se o cluster existe:**
```bash
aws eks describe-cluster --name cicd-lab --region us-east-1 --profile fiapaws
```

#### 🐳 Aplicação Docker
A aplicação de exemplo (fiap-todo-api) **já está incluída** neste repositório:
- Código fonte em: `app/`
- Dockerfile na raiz do repositório
- Pronta para build e deploy

### 3. Seguir Vídeos em Ordem

- [VIDEO-4.1-PASSO-A-PASSO.md](VIDEO-4.1-PASSO-A-PASSO.md) - GitOps com ArgoCD
- [VIDEO-4.2-PASSO-A-PASSO.md](VIDEO-4.2-PASSO-A-PASSO.md) - Pipeline GitOps Automatizado
- [VIDEO-4.3-PASSO-A-PASSO.md](VIDEO-4.3-PASSO-A-PASSO.md) - FluxCD e Comparação



### Limpeza de Recursos
**IMPORTANTE**: Sempre deletar recursos após a aula para evitar custos!

```bash
# Deletar aplicações
kubectl delete -f gitops-repo/applications/fiap-todo-api-app.yaml

# Deletar ArgoCD
kubectl delete namespace argocd

# Deletar FluxCD
flux uninstall

# Deletar cluster EKS
eksctl delete cluster --name cicd-lab --region us-east-1 --profile fiapaws
```

### Secrets
- ❌ **NUNCA** commitar secrets no repositório Git
- ✅ Use **Sealed Secrets** ou **External Secrets Operator**
- ✅ Configure `.gitignore` para arquivos sensíveis

### Boas Práticas GitOps
- ✅ **Git como única fonte da verdade** - Todo estado no Git
- ✅ **Declarativo** - Descrever estado desejado, não comandos
- ✅ **Versionado** - Usar Git para versionamento e auditoria
- ✅ **Automatizado** - Sync automático, sem intervenção manual
- ✅ **Observável** - Monitorar estado e detectar drift

## 🔗 Links Relacionados

- **Aula 03**: CI/CD com GitHub Actions
- **Aula 05**: Infrastructure as Code com Terraform
- **Repositório Principal**: [FIAP DevOps & Cloud Tools](https://github.com/fiap-devops)
