PetDeliveryCE — LGPD v2

Base: commit 79a3ca3 (versão imediatamente anterior à primeira implementação de LGPD).

Correções incluídas:
- LGPD no cadastro principal de cliente e lojista.
- LGPD no cadastro rápido do cliente dentro do marketplace.
- Checkbox visível para Política de Privacidade e Termos de Uso.
- Consentimento de marketing separado e opcional.
- Backend rejeita cadastro sem os dois aceites obrigatórios.
- Registro de versão, data/hora, IP e user-agent dos aceites.
- Área /minha-privacidade para cliente e lojista.
- Central /admin/privacy para solicitações, auditoria e incidentes.
- Exportação de dados.
- Solicitações de acesso, correção, portabilidade e exclusão.
- Migração Prisma/PostgreSQL para as tabelas LGPD.
- Auditoria de cadastro/login/logout e alterações relevantes.
- Correção do erro JSX que anteriormente fazia o build quebrar no CustomerApp.

Validação realizada:
- node --check passou nos arquivos JavaScript do backend alterados.
- O build completo do frontend não pôde ser concluído neste ambiente porque a instalação das dependências npm excedeu o tempo disponível; por isso o projeto deve ser validado localmente com npm install/npm run build antes do push.

Não inclua .env, tokens, chaves ou credenciais no commit.
