-- CEOEXPRESS | Gestão Estratégica — modelos de contrato da CEOEXPRESS
--
-- 1. Cada modelo pode trazer textos sugeridos (escopo, honorários, prazos…)
--    que já vêm preenchidos no contrato novo e podem ser editados em cada um.
-- 2. Os três modelos que a CEOEXPRESS usa substituem o modelo genérico inicial.
--    Nomes, documentos, valores e datas de clientes viraram campos.
-- 3. Contratada padrão: J Nascimento Serviços Ltda. (só se ainda estiver vazia).

alter table public.contract_templates
  add column defaults jsonb not null default '{}'::jsonb
  check (jsonb_typeof(defaults) = 'object' and pg_column_size(defaults) < 200000);

-- O genérico sai; se algum contrato já o usa, fica só arquivado.
update public.contract_templates t set active = false
 where t.title = 'Contrato de prestação de serviços'
   and exists (select 1 from public.contracts c where c.template_id = t.id);
delete from public.contract_templates t
 where t.title = 'Contrato de prestação de serviços'
   and not exists (select 1 from public.contracts c where c.template_id = t.id);

update public.contract_settings set
  provider_name = 'J Nascimento Serviços Ltda.',
  provider_document = 'CNPJ nº 68.479.917/0001-54',
  provider_qualification = '**J NASCIMENTO SERVIÇOS LTDA.**, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 68.479.917/0001-54, com sede na Rua Cora Coralina, nº 184, Bairro Santa Helena, Belo Horizonte/MG, CEP 30642-500, atuando sob a marca CEO EXPRESS, representada na forma de seu contrato social, e-mail contratual joaoeustaquio@hotmail.com',
  default_city = case when default_city = '' then 'Belo Horizonte/MG' else default_city end,
  default_forum = case when default_forum = '' then 'Belo Horizonte/MG' else default_forum end
 where id and provider_qualification = '';

-- ---------------------------------------------------------------------------
-- 1. Consultoria em gestão estratégica e mentoria executiva (prazo determinado, parcelas)
-- ---------------------------------------------------------------------------
insert into public.contract_templates (title, description, sort_order, defaults, body) values (
  'Consultoria em gestão estratégica e mentoria executiva',
  'Prazo determinado, valor total em parcelas, com condição específica (ex.: suspensão excepcional). Para reestruturação de negócio com mentoria do sócio-fundador.',
  1,
  jsonb_build_object(
    'servico', 'Gestão Estratégica, Estruturação Empresarial e Mentoria Executiva',
    'duracao', '4 (quatro) meses',
    'forma_pagamento', 'boletos bancários encaminhados pela CONTRATADA à CONTRATANTE',
    'indice_correcao', 'IGP-M/FGV',
    'prazo_cura', 10,
    'multa_rescisoria', 20,
    'testemunhas', true,
    'preambulo', $t$Considerando que a CONTRATANTE mantém sua operação empresarial em funcionamento;

Considerando que a CONTRATANTE pretende aprimorar sua estrutura de gestão e seus processos internos, mediante a reestruturação do negócio e o desenvolvimento das competências empresariais de seu(sua) sócio(a)-fundador(a), {{contratante_representante}};

Considerando que a CONTRATADA possui experiência e conhecimento técnico na realização de diagnósticos empresariais, estruturação e reestruturação de negócios, planejamento estratégico, mentoria executiva e acompanhamento de gestores;$t$,
    'objeto', $t$O presente contrato tem por objeto a prestação, pela CONTRATADA, de serviços de gestão estratégica, estruturação empresarial e mentoria executiva destinados à reestruturação e ao desenvolvimento da operação da CONTRATANTE, contemplando:$t$,
    'escopo', $t$a) elaboração de diagnóstico empresarial;
b) elaboração do Plano de Negócios;
c) definição do modelo econômico aplicável a cada canal de atuação;
d) estabelecimento de metas e indicadores de desempenho;
e) elaboração do roadmap de implementação;
f) estruturação da governança e da organização empresarial;
g) definição de responsabilidades, papéis e rotinas de gestão;
h) acompanhamento da execução das ações definidas durante o projeto; e
i) realização de mentoria executiva com o(a) sócio(a)-fundador(a) {{contratante_representante}}.

1.2. A mentoria executiva prevista na alínea "i" terá como finalidade apoiar o desenvolvimento de {{contratante_representante}} em sua transição de uma atuação predominantemente operacional para uma posição de liderança empresarial, abrangendo, especialmente:

a) desenvolvimento da capacidade de delegação e liderança;
b) aprimoramento do processo de tomada de decisões com base em metas e indicadores;
c) estruturação de rotinas de gestão e acompanhamento de resultados; e
d) preservação de sua capacidade criativa, integrada a uma atuação empresarial mais estratégica e orientada ao crescimento sustentável do negócio.$t$,
    'condicoes_especiais', $t$6.1. Em caráter excepcional e por liberalidade da CONTRATADA, fica assegurado à CONTRATANTE, por meio de {{contratante_representante}}, o direito de solicitar a suspensão temporária da execução dos serviços caso, durante os primeiros 45 (quarenta e cinco) dias corridos, contados do início da vigência, constate não possuir disponibilidade suficiente para participar das mentorias, fornecer as informações necessárias ou executar as ações indispensáveis ao adequado andamento do projeto.

6.2. A solicitação de suspensão deverá ser encaminhada por escrito à CONTRATADA, por e-mail ou outro canal formal de comunicação utilizado entre as PARTES, não sendo necessária a comprovação da situação de sobrecarga ou indisponibilidade alegada.

6.3. A suspensão produzirá efeitos a partir da confirmação do recebimento da solicitação pela CONTRATADA e abrangerá:

a) a interrupção temporária das reuniões, mentorias, análises, entregas e demais atividades ainda não executadas;
b) a suspensão da exigibilidade das parcelas com vencimento posterior à formalização do pedido; e
c) a interrupção da contagem do prazo de execução dos serviços.

6.4. Permanecerão devidos os valores vencidos até a data da formalização da suspensão, bem como os valores correspondentes às atividades, reuniões, análises e entregas já realizadas pela CONTRATADA.

6.5. Caso exista pagamento antecipado referente a serviços ainda não executados na data da suspensão, o respectivo valor será mantido como crédito da CONTRATANTE e utilizado após a retomada das atividades.

6.6. Durante o período de suspensão, a CONTRATADA não ficará obrigada a realizar reuniões, mentorias, entregas, atendimentos ou quaisquer outras atividades previstas no objeto contratual.

6.7. Os serviços serão retomados a partir de [PREENCHER: data de retomada], restabelecendo-se, nessa mesma data, a execução das atividades e as obrigações contratuais que estiverem suspensas.

6.8. Havendo parcelas suspensas, a primeira parcela remanescente vencerá na data de retomada, e as demais, se existentes, vencerão no dia [PREENCHER: dia do mês] dos meses imediatamente subsequentes, até a quitação integral do valor previsto na Cláusula Quinta.

6.9. Após a retomada, os serviços continuarão pelo período de execução que ainda restava na data da suspensão, ficando a data de encerramento do contrato automaticamente prorrogada pelo período necessário à conclusão do prazo de execução efetiva previsto na Cláusula Quarta.

6.10. A suspensão excepcional poderá ser utilizada uma única vez e não será considerada rescisão, inadimplemento, novação ou alteração do valor total contratado.

6.11. Durante o período de suspensão regularmente formalizado, não incidirão multa, juros ou qualquer outra penalidade sobre as parcelas cuja exigibilidade estiver suspensa.$t$
  ),
  $tpl$# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA

**I.** {{contratante_qualificacao}}, doravante denominado(a) simplesmente **CONTRATANTE**, e

**II.** {{contratada_qualificacao}}, doravante denominada **CONTRATADA**, ajustam, entre si, o seguinte:

{{preambulo}}

As PARTES, de livre e comum acordo, resolvem celebrar o presente Contrato de Prestação de Serviços de {{servico}}, que será regido pelas cláusulas e condições seguintes.

## CLÁUSULA PRIMEIRA – OBJETO

1.1. {{objeto}}

{{escopo}}

1.3. Os serviços possuem natureza técnica, estratégica e orientativa, constituindo obrigação de meio, e não de resultado. A CONTRATADA não garante resultados financeiros, comerciais ou operacionais específicos, uma vez que a implementação das recomendações e o desempenho do negócio dependem também das decisões, informações, recursos e providências de responsabilidade da CONTRATANTE.

## CLÁUSULA SEGUNDA – OBRIGAÇÕES DA CONTRATADA

2.1. A CONTRATADA executará os serviços descritos neste instrumento com autonomia técnica, administrativa e operacional, utilizando seus próprios métodos, conhecimentos, ferramentas e critérios profissionais, observados o escopo, os objetivos e o cronograma acordados entre as PARTES.

2.2. A autonomia da CONTRATADA não impede que a CONTRATANTE acompanhe a execução dos serviços, solicite informações sobre o andamento do projeto e verifique a conformidade das entregas com o escopo contratado, desde que não haja interferência na organização interna da CONTRATADA, controle de jornada ou subordinação jurídica e hierárquica.

2.3. Constituem obrigações da CONTRATADA:

a) executar os serviços com diligência, qualidade técnica, boa-fé e observância das práticas profissionais aplicáveis;
b) cumprir o escopo e o cronograma acordados, ressalvados os atrasos decorrentes da ausência ou demora no fornecimento de informações, documentos, decisões ou acessos de responsabilidade da CONTRATANTE;
c) manter a CONTRATANTE informada sobre o andamento dos trabalhos e comunicar eventuais fatos que possam comprometer os prazos ou as entregas; e
d) apresentar os diagnósticos, planos, indicadores, recomendações e demais entregas previstas neste contrato.

2.4. Não se estabelece qualquer vínculo empregatício entre a CONTRATANTE e a CONTRATADA, e seus sócios.

2.5. A CONTRATADA será exclusivamente responsável pelas obrigações trabalhistas, previdenciárias, tributárias e fiscais relacionadas aos profissionais por ela designados, sem prejuízo das retenções tributárias que a CONTRATANTE esteja legalmente obrigada a realizar.

## CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DA CONTRATANTE

3.1. Constituem obrigações da CONTRATANTE:

a) autorizar, mediante prévio alinhamento entre as PARTES, o acesso da CONTRATADA às suas dependências, sistemas e ambientes de trabalho, quando necessário à execução dos serviços;
b) fornecer, de forma completa, correta e dentro dos prazos solicitados, todas as informações, documentos, dados e acessos necessários à execução do objeto contratado;
c) indicar um responsável interno para centralizar as comunicações, providenciar informações, validar entregas e apoiar a execução do projeto;
d) assegurar a participação de {{contratante_representante}} nas reuniões, mentorias e atividades que dependam diretamente de sua atuação;
e) analisar e se manifestar sobre as solicitações, recomendações e entregas apresentadas pela CONTRATADA, dentro dos prazos estabelecidos entre as PARTES;
f) responsabilizar-se pelas decisões empresariais e pela implementação das recomendações apresentadas pela CONTRATADA; e
g) efetuar o pagamento dos valores contratados nas respectivas datas de vencimento.

3.2. A CONTRATADA não será responsável por atrasos, inconsistências nas análises ou prejuízos decorrentes de informações incorretas, incompletas, desatualizadas ou fornecidas fora do prazo pela CONTRATANTE.

3.3. Caso o atraso no fornecimento de documentos, informações, acessos, aprovações ou decisões pela CONTRATANTE comprometa a execução dos serviços, os prazos correspondentes serão prorrogados pelo período necessário à regularização da pendência, mediante comunicação da CONTRATADA.

3.4. O pagamento dos valores contratados não poderá ser suspenso ou retido com base em avaliação subjetiva das entregas. Eventual desconformidade com o escopo deverá ser comunicada formalmente à CONTRATADA, com a identificação específica do item questionado e a concessão de prazo razoável para análise e, quando cabível, correção.

## CLÁUSULA QUARTA – DA VIGÊNCIA E DO PRAZO DE EXECUÇÃO

4.1. O presente contrato terá prazo determinado de {{duracao}}, com início em {{data_inicio_extenso}} e término previsto para {{data_termino_extenso}}, período no qual deverão ser executados os serviços previstos em seu objeto, ressalvadas as hipóteses de suspensão ou prorrogação expressamente estabelecidas neste instrumento.

4.2. A vigência contratual e o prazo de execução dos serviços serão concomitantes ao período de pagamento estabelecido na Cláusula Quinta, preservando-se, em qualquer hipótese, o direito da CONTRATADA ao recebimento dos valores correspondentes aos serviços efetivamente executados.

4.3. Encerrado o prazo previsto no item 4.1, o contrato será considerado automaticamente concluído, independentemente de aviso ou notificação, salvo prorrogação acordada por escrito ou prevista na Cláusula Sexta.

4.4. Após a conclusão do objeto inicialmente contratado, as PARTES poderão acordar a continuidade da relação profissional por meio da contratação de novos serviços, incluindo atividades de gestão estratégica, consultoria, assessoria, mentoria executiva ou participação em conselho consultivo.

4.5. A continuidade prevista no item 4.4 não será automática e dependerá da celebração de novo contrato ou termo aditivo escrito, no qual deverão ser definidos o novo escopo, a modalidade de atuação, o prazo, a remuneração e as demais condições aplicáveis.

## CLÁUSULA QUINTA – DO PREÇO E DA FORMA DE PAGAMENTO

5.1. Pela execução integral dos serviços que constituem o objeto deste contrato, a CONTRATANTE pagará à CONTRATADA o valor total de {{valor_total}} ({{valor_total_extenso}}).

5.2. O valor total será pago da seguinte forma:

{{parcelas}}

5.3. Os pagamentos serão realizados por meio de {{forma_pagamento}}, utilizando-se os canais de comunicação informados neste contrato ou habitualmente adotados entre as PARTES.

5.4. A ausência de recebimento do boleto ou do documento de cobrança não afastará a obrigação de pagamento. Nessa hipótese, a CONTRATANTE deverá solicitar à CONTRATADA, antes do vencimento, o reenvio do documento ou a indicação de outro meio adequado para quitação.

5.5. Os vencimentos previstos nesta cláusula somente serão modificados por acordo escrito entre as PARTES ou nas hipóteses previstas na Cláusula Sexta.

## CLÁUSULA SEXTA – DAS CONDIÇÕES ESPECÍFICAS

{{condicoes_especiais}}

## CLÁUSULA SÉTIMA – DAS PENALIDADES E DO INADIMPLEMENTO

7.1. O descumprimento de qualquer obrigação contratual deverá ser comunicado por escrito à Parte inadimplente, que terá o prazo de {{prazo_cura}} dias úteis para regularizar a situação, quando possível.

7.2. Não havendo regularização, a Parte prejudicada poderá rescindir o contrato e cobrar multa compensatória de {{multa_rescisoria}} sobre o saldo da remuneração ainda devida, sem prejuízo da cobrança de eventuais perdas e danos comprovados.

7.3. O atraso no pagamento sujeitará a CONTRATANTE à multa de {{multa_atraso}}, correção monetária pelo {{indice_correcao}} e juros de mora de {{juros_mes}} ao mês, calculados proporcionalmente aos dias de atraso.

7.4. O atraso superior a 10 (dez) dias corridos autorizará a CONTRATADA a suspender os serviços. Se ultrapassar 20 (vinte) dias corridos, a CONTRATADA poderá rescindir o contrato e cobrar os valores vencidos e demais penalidades aplicáveis.

7.5. O exercício das condições previstas na Cláusula Sexta não será considerado inadimplemento nem acarretará qualquer penalidade.

## CLÁUSULA OITAVA – DAS CONDIÇÕES GERAIS

8.1. A eventual tolerância de uma Parte quanto ao descumprimento de obrigação contratual não implicará renúncia de direitos ou alteração deste contrato.

8.2. Qualquer alteração deste contrato somente será válida se formalizada por escrito e aceita por ambas as PARTES.

8.3. As PARTES deverão manter sigilo sobre todas as informações, documentos, métodos, estratégias e materiais recebidos em razão deste contrato, inclusive após o seu encerramento, salvo autorização expressa da Parte titular ou obrigação legal.

8.4. Este contrato obriga as PARTES e seus sucessores e, quando atendidos os requisitos legais, constitui título executivo extrajudicial.

## CLÁUSULA NONA – DO FORO

9.1. Fica eleito o Foro da Comarca de {{foro}} para resolver controvérsias decorrentes deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem de acordo, as PARTES assinam o presente contrato, física ou eletronicamente, juntamente com duas testemunhas, quando aplicável.

> {{cidade}}, {{data_extenso}}.

{{assinaturas}}
$tpl$
);

-- ---------------------------------------------------------------------------
-- 2. Assessoria em estruturação estratégica e modelagem empresarial (mensal, remuneração variável)
-- ---------------------------------------------------------------------------
insert into public.contract_templates (title, description, sort_order, defaults, body) values (
  'Assessoria estratégica com honorários mensais',
  'Vigência de 12 meses com renovação automática, dedicação mensal em horas e honorários mensais (ex.: percentual da receita com piso).',
  2,
  jsonb_build_object(
    'servico', 'Assessoria em Estruturação Estratégica e Modelagem Empresarial',
    'duracao', '12 (doze) meses',
    'dedicacao', 'até 20 (vinte) horas mensais',
    'indice_correcao', 'IGP-M/FGV',
    'prazo_cura', 10,
    'aviso_previo', 60,
    'multa_rescisoria', 20,
    'testemunhas', true,
    'preambulo', $t$As PARTES celebram este contrato para apoiar a gestão da CONTRATANTE, organizar controles e rotinas e construir o plano de negócios da empresa. O trabalho seguirá as condições abaixo.$t$,
    'objeto', $t$A CONTRATADA prestará assessoria de estruturação estratégica e modelagem empresarial nas frentes financeira, administrativa e de modelo de negócios. O serviço inclui acompanhar as ações aprovadas e elaborar, de forma progressiva, o plano de negócios da CONTRATANTE.$t$,
    'escopo', $t$3.1. Frente financeira: estruturação de modelo de fluxo de caixa móvel de 13 semanas, com entradas confirmadas e estimadas separadas, desembolsos vinculados a projetos e saldo mínimo de caixa a definir com a direção; orientação para comparação semanal entre previsto e realizado; estruturação e análise mensal da DRE gerencial, da margem por projeto ou família de serviços e do orçamento.

3.2. As análises apoiarão decisões sobre capital de giro, prazos comerciais, compromissos e investimentos. Caberá à equipe financeira da CONTRATANTE alimentar os registros e atualizar os controles. A CONTRATADA organizará os modelos, analisará os dados e recomendará medidas. O serviço não inclui escrituração contábil, auditoria, conciliação diária ou execução de pagamentos.

3.3. Frente administrativa: mapeamento dos fluxos críticos de orçamento, aprovação, execução, medição, faturamento e recebimento, com identificação de etapas, responsáveis e critérios de aprovação; estruturação de plano de ação com até três prioridades principais por trimestre, responsável interno, prazo e evidência de execução.

3.4. Cada acompanhamento registrará a recomendação, a decisão de {{contratante_representante}} e o andamento da execução. As prioridades serão revistas nos meses 3, 6, 9 e 12, dentro da capacidade mensal contratada.

3.5. Modelo de negócios e crescimento: a assessoria contemplará perfil de cliente ideal, revisão das ofertas e proposta de valor para os segmentos de clientes atendidos; avaliação de canais e critérios de preço, considerando margem, capacidade de atendimento e caixa; e mecanismos gerenciais para organizar e proteger o relacionamento comercial com os parceiros.

3.6. Ao longo do contrato, serão analisados casos comerciais e referências públicas. O trabalho será realizado com documentos, registros, dados internos e reuniões com a direção e a equipe.

3.7. A assessoria avaliará cenários de crescimento e investimento, a capacidade da operação e o papel da tecnologia. Essa avaliação não inclui desenvolver aplicativo, software ou negócio autônomo de tecnologia. Instrumentos jurídicos sobre parceiros, proteção comercial ou estrutura societária dependerão da validação de profissional habilitado, contratado separadamente pela CONTRATANTE.$t$,
    'honorarios', $t$Os honorários mensais serão o maior valor entre [PREENCHER: percentual]% da receita operacional bruta efetivamente recebida pela operação contratada no mês de apuração e R$ [PREENCHER: valor do piso] ([PREENCHER: valor por extenso]), considerado piso mínimo de remuneração. O piso não se soma ao percentual. O plano de negócios está incluído, e não haverá taxa de implantação.$t$,
    'condicoes_especiais', $t$8.3. Excepcionalmente, a primeira apuração abrangerá os recebimentos de [PREENCHER: data de início] a [PREENCHER: último dia do mês] e será concluída até o quinto dia útil do mês seguinte, com vencimento no dia 10 desse mês. Após esse período inicial, a apuração e o pagamento seguirão a periodicidade mensal prevista no item 8.1.$t$
  ),
  $tpl$# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE {{servico_maiusculo}}

**CONTRATANTE:** {{contratante_qualificacao}}.

**CONTRATADA:** {{contratada_qualificacao}}.

{{preambulo}}

## 1 Objeto e natureza da atuação

1.1. {{objeto}}

1.2. A assessoria compreende análises, modelos gerenciais, recomendações e acompanhamento. As decisões, a liderança da equipe e a autorização de despesas permanecem com {{contratante_representante}}, como representante da CONTRATANTE, que também responde pela execução operacional. Este contrato não concede mandato, poderes bancários ou representação da CONTRATANTE. Também não nomeia a CONTRATADA ou seus sócios como administradores estatutários da empresa.

1.3. Os serviços constituem obrigação de meio, sem afastar o compromisso de produzir as entregas contratadas. A CONTRATADA não garante faturamento, lucro, captação, recuperação financeira ou resultado comercial específico. As metas de desempenho serão pactuadas após a avaliação da situação inicial.

1.4. Integra o presente Contrato, para todos os fins e efeitos, a Proposta Comercial aceita pelas Partes, a qual passa a constituir parte integrante e indissociável deste instrumento. As condições comerciais, escopo, prazos e demais disposições previstas na Proposta Comercial serão aplicáveis naquilo que não conflitarem com os termos deste Contrato.

## 2 Vigência

2.1. A vigência inicial será de {{duracao}}, contados da assinatura deste instrumento, com possibilidade de revisão a cada 180 (cento e oitenta) dias. Eventuais alterações de escopo, dedicação ou remuneração dependerão de acordo escrito entre as PARTES.

2.2. Findo o prazo inicial, o presente contrato será automaticamente renovado por iguais e sucessivos períodos, salvo manifestação contrária de qualquer das Partes, mediante notificação por escrito com, no mínimo, 30 (trinta) dias de antecedência do término do período vigente.

## 3 Escopo dos serviços

{{escopo}}

## 4 Limites do serviço

4.1. A ampliação do escopo, a dedicação adicional e a assunção de funções executivas dependerão de aditivo com responsabilidades, prazos e remuneração definidos. O aumento da receita não amplia automaticamente as horas ou as obrigações contratadas.

## 5 Dedicação e rotina de trabalho

5.1. A dedicação total será de {{dedicacao}}, abrangendo reuniões, análises, preparação de materiais e interlocução, em dias úteis, com atuação predominantemente remota e autonomia de organização da CONTRATADA. Não haverá exclusividade, subordinação ou controle de jornada.

5.2. A agenda compreenderá até cinco encontros on-line por mês, com 60 minutos cada, incluindo reuniões semanais e revisão mensal de resultados. Oficinas e encontros remotos com a equipe ocuparão essa mesma agenda, sem gerar reuniões adicionais. As datas serão alinhadas conforme a disponibilidade das PARTES.

5.3. As dúvidas terão retorno inicial em até dois dias úteis. Esse retorno poderá confirmar o recebimento, trazer uma orientação inicial ou indicar o encaminhamento necessário; não significa a conclusão de análises complexas nesse prazo. O atendimento integra a dedicação mensal contratada.

5.4. Se a capacidade contratada se mostrar insuficiente, a CONTRATADA informará a situação e proporá a revisão das prioridades ou um aditivo. Não haverá cobrança adicional unilateral. A remuneração mensal também cobre a reserva da capacidade contratada.

5.5. Encontros presenciais e despesas extras dependerão de aprovação prévia e escrita. Quando necessários e aprovados, deslocamento, hospedagem, alimentação e outras despesas autorizadas serão cobertos pela CONTRATANTE. A aprovação definirá agenda, orçamento e tratamento do tempo de deslocamento.

## 6 Obrigações das partes

6.1. A CONTRATADA executará os serviços com diligência, boa-fé, qualidade técnica e autonomia; produzirá as entregas; manterá a direção informada; comunicará riscos, pendências e limitações dos dados; e guardará sigilo sobre as informações recebidas.

6.2. A CONTRATANTE indicará interlocutor com acesso às informações e assegurará a participação de {{contratante_representante}} nas decisões; fornecerá dados corretos, documentos e acessos necessários; manterá equipe para alimentar os controles e executar ações; validará prioridades e efetuará os pagamentos. Obrigações trabalhistas, tributárias, operacionais e financeiras da CONTRATANTE permanecem sob sua responsabilidade.

6.3. A CONTRATANTE disponibilizará a base inicial em até dez dias úteis do início da vigência. Comentários e decisões serão encaminhados em até cinco dias úteis de cada solicitação. O acesso aos dados ficará limitado ao necessário para executar o contrato.

6.4. Atrasos ou inconsistências atribuíveis à CONTRATANTE serão registrados. As PARTES ajustarão por escrito os marcos afetados, enquanto a CONTRATADA poderá avançar nas frentes independentes e apresentar análises com ressalvas. Essas pendências não eliminam a remuneração pela capacidade efetivamente disponibilizada. Também não autorizam prorrogação remunerada automática ou dispensa de entregas. Impedimentos persistentes serão tratados conforme a cláusula 9.

## 7 Honorários e base de cálculo

7.1. {{honorarios}}

## 8 Apuração e pagamento

8.1. A apuração dos recebimentos do mês civil anterior será concluída até o quinto dia útil do mês corrente, com demonstrativo, extratos e relatórios suficientes para conciliar a base. O pagamento ocorrerá até o dia 10 desse mês, por boleto ou transferência para conta da CONTRATADA.

8.2. O atraso no pagamento sujeitará a CONTRATANTE à multa de {{multa_atraso}}, correção monetária pelo {{indice_correcao}} e juros de mora de {{juros_mes}} ao mês, proporcionais aos dias de atraso. A CONTRATADA notificará previamente a CONTRATANTE antes de suspender serviços por atraso superior a dez dias corridos; ultrapassados vinte dias, poderá rescindir, observadas as comunicações da cláusula 9.

{{condicoes_especiais}}

## 9 Encerramento e inadimplemento

9.1. O contrato se encerrará ao término do período vigente se houver a manifestação contrária à renovação prevista na cláusula 2.2, por distrato escrito ou por rescisão. Qualquer parte poderá solicitar encerramento antecipado sem justa causa mediante aviso escrito de {{aviso_previo}} dias, mantendo-se os serviços e a remuneração durante o aviso, salvo dispensa expressa acordada entre as PARTES.

9.2. No encerramento antecipado com justa causa, a parte que o provocar pagará à outra multa de {{multa_rescisoria}} sobre os pisos mensais remanescentes após o aviso, proporcionalmente às frações de mês. Receitas futuras não serão estimadas para compor essa multa. Em distrato, as PARTES poderão ajustar condição diversa. Essa regra substitui, na medida legalmente admitida, indenizações contratuais pela mesma causa, vedada duplicidade.

9.3. O descumprimento será comunicado por escrito, com {{prazo_cura}} dias úteis para regularização, quando possível. Persistindo, a parte prejudicada poderá rescindir por justa causa e exigir a multa compensatória da cláusula 9.2 da parte inadimplente, sem cumulação por esse mesmo fato, preservadas responsabilidades legalmente inderrogáveis.

9.4. No encerramento, a CONTRATADA entregará os materiais produzidos e o registro de pendências, sem prejuízo da cobrança dos valores devidos. A conclusão do plano de negócios pressupõe o ciclo completo de vigência inicial. Se houver rescisão antecipada, serão entregues os conteúdos desenvolvidos até a data, sem obrigação de antecipar etapas futuras. Qualquer suspensão consensual dependerá de termo escrito que defina seus efeitos sobre os prazos e os pagamentos.

## 10 Confidencialidade e proteção de dados

10.1. As PARTES guardarão sigilo sobre as informações financeiras, comerciais, cadastrais, estratégicas e técnicas a que tiverem acesso em razão deste contrato, durante e após a vigência. O acesso ficará restrito às pessoas que precisem dessas informações e estejam sujeitas ao dever de confidencialidade. Marcas, resultados ou casos identificáveis não poderão ser divulgados sem autorização escrita.

10.2. O sigilo não abrange informações comprovadamente públicas sem violação contratual, já legitimamente conhecidas ou recebidas de terceiro sem restrição. Divulgação por determinação legal será limitada ao exigido, com aviso prévio à outra parte quando permitido.

10.3. As PARTES observarão a legislação de proteção de dados pessoais. Cada uma responderá pelos tratamentos sob sua decisão; quando a CONTRATADA tratar dados por conta da CONTRATANTE, seguirá instruções documentadas, finalidade contratual e acesso mínimo necessário, adotando medidas de segurança adequadas. Incidentes relevantes serão comunicados sem demora indevida, com as informações disponíveis para permitir as providências cabíveis.

## 11 Materiais e autonomia profissional

11.1. A CONTRATANTE poderá usar, editar e compartilhar internamente as entregas específicas para gerir seu negócio. Métodos, ferramentas e conhecimentos preexistentes permanecem de titularidade da CONTRATADA, com uso autorizado na medida necessária às entregas. Este contrato não cede dados ou direitos de terceiros nem autoriza a revenda da metodologia da CONTRATADA.

11.2. Cada parte responde por seus empregados, prestadores, tributos e obrigações. A contratação não constitui sociedade, vínculo de emprego, solidariedade por dívidas ou exclusividade. A autonomia não afasta responsabilidade por atos ou omissões imputáveis a cada parte, nos termos legais.

## 12 Comunicações e disposições finais

12.1. Avisos contratuais, notificações e aprovações serão enviados por escrito aos e-mails do preâmbulo, com comprovação de recebimento. Os canais usuais poderão ser usados na rotina e nas aprovações operacionais registradas. Alterações contratuais exigem a concordância escrita dos representantes das PARTES.

12.2. Fica eleito o Foro da Comarca de {{foro}}, domicílio da CONTRATADA, para controvérsias decorrentes deste contrato. As PARTES poderão assinar física ou eletronicamente, por mecanismo que permita verificar autoria e integridade, com duas testemunhas quando cabíveis.

## 13 Assinaturas

As PARTES declaram que leram e concordam com as condições deste contrato, inclusive seu escopo de assessoria, dedicação, remuneração, piso e regras de encerramento.

> {{cidade}}, {{data_extenso}}.

{{assinaturas}}
$tpl$
);

-- ---------------------------------------------------------------------------
-- 3. Mentoria estratégica (pessoa física, programa com Anexo I)
-- ---------------------------------------------------------------------------
insert into public.contract_templates (title, description, sort_order, defaults, body) values (
  'Mentoria estratégica',
  'Mentoria individual (em geral pessoa física), valor total em parcelas e programa detalhado no Anexo I.',
  3,
  jsonb_build_object(
    'servico', 'Mentoria Estratégica',
    'duracao', '10 (dez) semanas',
    'indice_correcao', 'IGP-M/FGV',
    'prazo_cura', 15,
    'aviso_previo', 30,
    'multa_rescisoria', 20,
    'sigilo_anos', 2,
    'testemunhas', true,
    'preambulo', $t$Considerando que o Contratante é um profissional em exercício de liderança, com histórico de atuação estratégica e operacional, buscando dar um salto qualitativo em sua trajetória profissional;

Considerando que a Contratada possui notória especialização e conhecimento técnico na condução de processos de mentoria estratégica para líderes executivos e empreendedores, com mais de 25 anos de experiência em franchising, expansão, implantação, gestão, inovação e estratégia; e

Considerando a necessidade do Contratante de desenvolver uma visão estratégica de carreira, construir um portfólio de entregas mensuráveis e fortalecer seu posicionamento profissional, tanto dentro de sua organização atual quanto no mercado, com base em projetos concretos de alto impacto e linguagem executiva orientada a resultado.$t$,
    'objeto', $t$Os serviços compreendem o diagnóstico de perfil comportamental, a elaboração de plano de ação de protagonismo, a construção de business cases orientados a ROI, o desenvolvimento de narrativa profissional e o acompanhamento estratégico durante todo o processo.$t$,
    'escopo', $t$## 1. Estrutura do Programa

O programa de mentoria estratégica terá duração de aproximadamente {{duracao}}, dividido em 3 fases, com sessões individuais e suporte contínuo por WhatsApp entre os encontros. O prazo pode se estender, a depender da evolução do processo.

## 2. Fase 1 — Diagnóstico & Mapa de Batalha (Semanas 1 a 3)

- Aplicação e análise de teste de perfil comportamental (ferramenta proprietária da Contratada);
- Mapeamento do perfil profissional do Contratante: forças, riscos, estilo de liderança e pontos de evolução;
- Análise do perfil da liderança com quem o Contratante se relaciona (stakeholders-chave), identificando pontos de sinergia e potenciais atritos;
- Definição de objetivos profissionais claros para os horizontes de 6, 12 e 24 meses;
- Entregável: Laudo de Perfil Comportamental com mapa de objetivos e análise de stakeholders.

## 3. Fase 2 — Projetos, Business Cases & Protagonismo (Semanas 4 a 7)

- Levantamento e priorização dos 2 a 3 projetos de maior impacto e menor atrito político disponíveis ao Contratante em seu ambiente atual;
- Construção de business cases estruturados com: problema identificado, solução proposta, custo estimado, ganho esperado e ROI demonstrado;
- Desenvolvimento de modelo de apresentação executiva para a diretoria: como comunicar iniciativas com autoridade e linguagem orientada a resultado;
- Orientação sobre postura estratégica, comunicação e negociação com a liderança;
- Entregável: 2 a 3 business cases prontos + Plano de Protagonismo de 90 dias.

## 4. Fase 3 — Execução, Portfólio & Próximo Nível (Semanas 8 a 10)

- Acompanhamento e revisão dos primeiros movimentos práticos do Contratante com base no plano desenvolvido;
- Ajustes de postura, comunicação e estratégia conforme os desdobramentos reais;
- Construção da narrativa profissional baseada em entregas mensuráveis: como o Contratante deve descrever seus projetos dentro da organização e no mercado;
- Avaliação de cenários: crescimento na posição atual, negociação de promoção/aumento, ou abertura de novos caminhos profissionais;
- Entregável: Narrativa Profissional consolidada + Mapa de Próximos Passos com plano de ação para cada cenário.

## 5. Suporte Contínuo

- Acesso direto à Contratada via WhatsApp durante toda a vigência do programa;
- Suporte pontual para dúvidas, revisão de comunicações com a diretoria e alinhamentos estratégicos em tempo real;
- Disponibilidade de resposta em até 24 horas úteis.

## 6. Resumo dos Entregáveis

- 01 · Laudo de Perfil Comportamental · Fase 1
- 02 · Plano de Protagonismo 90 Dias · Fase 2
- 03 · Business Cases Prontos (2–3 projetos) · Fase 2
- 04 · Narrativa Profissional · Fase 3
- 05 · Mapa de Próximos Passos · Fase 3
- 06 · Suporte por WhatsApp · Contínuo$t$
  ),
  $tpl$# CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE {{servico_maiusculo}}

{{contratada_qualificacao}} ("Contratada");

{{contratante_qualificacao}} ("Contratante").

Contratante e Contratada em conjunto denominadas "Partes", e individualmente "Parte".

## Preâmbulo

{{preambulo}}

Resolvem as Partes firmarem o presente Contrato de Prestação de Serviços de {{servico}} ("Contrato"), regulamentando-o pelas disposições seguintes, as quais são essenciais à eficácia do avençado.

## Cláusula Primeira – Do Objeto

1.1 O objeto do presente contrato é a prestação de serviços de {{servico}} personalizada, voltada ao desenvolvimento profissional e à construção de protagonismo de carreira do Contratante, conforme o escopo de trabalho detalhado no Anexo I, parte integrante e indissociável deste instrumento.

1.2 {{objeto}}

1.3 A finalidade da mentoria é entregar ao Contratante um conjunto de ferramentas práticas e aplicáveis, conforme os entregáveis descritos no Anexo I, que servirão como base para a tomada de decisões sobre sua trajetória profissional, seu posicionamento de mercado e eventuais oportunidades de crescimento ou transição.

1.4 Os serviços serão prestados por meio de encontros individuais virtuais ou presenciais, em dias e horários acordados entre as Partes, com suporte adicional por WhatsApp entre as sessões.

## Cláusula Segunda – Da Natureza dos Serviços e da Inexistência de Vínculo

2.1 A prestação de serviços objeto deste contrato ocorrerá com absoluta autonomia técnica e sem qualquer tipo de subordinação jurídica ou hierárquica por parte da Contratada em relação ao Contratante. A Contratada utilizará seus próprios métodos, expertise e ferramentas para alcançar os resultados propostos.

2.2 Fica expressamente estabelecido que não existirá qualquer vínculo empregatício entre as Partes. Todas as obrigações trabalhistas, previdenciárias, fiscais e de acidente de trabalho são de responsabilidade exclusiva da Contratada.

2.3 Este instrumento formaliza uma relação de natureza estritamente civil e comercial. As Partes declaram que o presente contrato não estabelece qualquer forma de sociedade, joint venture, representação comercial, agência ou qualquer outra modalidade de associação.

## Cláusula Terceira – Das Obrigações de Execução do Serviço

3.1 **Padrão de Qualidade.** A Contratada compromete-se a executar os serviços com a mais alta diligência e competência técnica, empregando as melhores práticas de mercado em mentoria executiva e desenvolvimento de lideranças, orientando-se sempre para o atingimento dos objetivos descritos no Anexo I.

3.2 **Comunicação e Acompanhamento.** A Contratada manterá o Contratante informado sobre o andamento do processo, com canais de comunicação ágeis, sessões de acompanhamento periódicas e suporte por WhatsApp entre os encontros formais.

3.3 **Responsabilidade Civil.** A Contratada responderá por quaisquer danos materiais ou morais que, por ação ou omissão comprovada, venha a causar ao Contratante durante a execução dos serviços.

## Cláusula Quarta – Das Obrigações do Contratante

4.1 **Colaboração Ativa.** O Contratante deverá participar ativamente das sessões agendadas, fornecer as informações necessárias para a execução do diagnóstico e dos entregáveis, e realizar as atividades acordadas entre os encontros.

4.2 **Veracidade das Informações.** O Contratante é responsável pela veracidade e integridade das informações compartilhadas, reconhecendo que a qualidade dos entregáveis depende diretamente da exatidão do material fornecido.

4.3 **Pagamento Pontual.** Realizar o pagamento dos valores pactuados nas datas e formas estabelecidas na Cláusula Quinta, sendo esta condição essencial para a continuidade dos serviços.

## Cláusula Quinta – Do Preço e das Condições de Pagamento

5.1 Pelos serviços de mentoria estratégica que constituem o objeto deste contrato, o Contratante pagará à Contratada o valor total de {{valor_total}} ({{valor_total_extenso}}).

5.2 O valor estipulado no item 5.1 será pago da seguinte forma:

{{parcelas}}

5.3 **Dados para Pagamento.** Os pagamentos deverão ser realizados via {{forma_pagamento}}.

5.4 O atraso no pagamento de qualquer parcela sujeitará o Contratante à aplicação de multa moratória de {{multa_atraso}} sobre o valor devido, acrescida de juros de mora de {{juros_mes}} ao mês e correção monetária pelo {{indice_correcao}}, calculados pro rata die até a data do efetivo pagamento.

## Cláusula Sexta – Das Penalidades e da Rescisão

6.1 O descumprimento de qualquer obrigação relevante prevista neste contrato por qualquer das Partes, que não seja sanado em prazo de {{prazo_cura}} dias após notificação, ensejará a aplicação de multa compensatória de {{multa_rescisoria}} do valor total contratado, sem prejuízo da apuração de perdas e danos adicionais.

6.2 **Rescisão por Mútuo Acordo.** Este contrato poderá ser extinto a qualquer tempo, sem quaisquer ônus, desde que haja consentimento mútuo formalizado por escrito de ambas as Partes através de Termo de Distrato.

6.3 **Rescisão Imotivada.** Qualquer das Partes poderá rescindir este contrato de forma unilateral e imotivada, mediante notificação escrita com antecedência mínima de {{aviso_previo}} dias. Durante o aviso prévio, todas as obrigações contratuais permanecem em vigor.

6.4 Em qualquer hipótese de término do contrato, o Contratante deverá quitar os valores proporcionais aos serviços efetivamente prestados pela Contratada até a data da rescisão, além das multas aplicáveis, se houver.

## Cláusula Sétima – Da Confidencialidade e Sigilo

7.1 A Contratada compromete-se a manter sigilo sobre todas as informações não públicas obtidas do Contratante durante a execução dos serviços, tratando-as de forma ética e confidencial.

7.2 A obrigação de confidencialidade vigorará durante toda a execução deste contrato e permanecerá válida por {{sigilo_anos}} anos após o seu término ou rescisão.

7.3 Não se consideram informações confidenciais: (i) dados de domínio público; (ii) informações que a Contratada já detinha antes de sua revelação; (iii) informações cuja divulgação seja exigida por lei ou decisão judicial.

7.4 Fica reconhecido que a Contratada possui know-how, metodologias, frameworks e modelos de análise próprios, anteriores e independentes deste contrato, cujo uso não configurará violação de confidencialidade.

## Cláusula Oitava – Do Tratamento de Dados Pessoais e Conformidade com a LGPD

8.1 Para os fins de cumprimento da Lei nº 13.709/2018 (LGPD), as Partes reconhecem que o Contratante é o Titular dos dados pessoais eventualmente compartilhados, enquanto a Contratada atuará como Operadora de forma limitada e acessória, tratando dados pessoais somente na medida necessária à execução dos serviços de mentoria.

8.2 A Contratada compromete-se a tratar eventuais dados pessoais recebidos exclusivamente para a execução dos serviços contratados, adotando medidas de segurança razoáveis e proporcionais à sua estrutura.

8.3 Após o término deste contrato, a Contratada deverá eliminar de forma segura os dados pessoais eventualmente tratados, sendo permitida a manutenção de registros técnicos anonimizados que integrem seu acervo metodológico.

## Cláusula Nona – Das Disposições Gerais e Finais

9.1 **Integralidade do Acordo.** Este instrumento, incluindo seu Anexo I, representa o acordo integral entre as Partes, substituindo quaisquer tratativas ou entendimentos prévios, verbais ou escritos.

9.2 **Boa-Fé e Autonomia.** As Partes declaram que celebram o presente contrato de forma livre, consciente e equilibrada, pautadas pelos princípios da boa-fé, transparência e lealdade, reconhecendo que a Contratada atua como empresa independente.

9.3 **Tolerância e Não Renúncia.** A eventual tolerância de uma das Partes quanto ao descumprimento de qualquer obrigação não constituirá novação, perdão ou renúncia de direito.

9.4 **Assinaturas Eletrônicas.** As Partes reconhecem a validade das assinaturas eletrônicas apostas neste instrumento, nos termos da MP nº 2.200-2/2001 e demais normas aplicáveis.

9.5 **Comunicações e Notificações.** Todas as comunicações deverão ser realizadas por escrito, preferencialmente por e-mail com confirmação de leitura, sendo válidas as mensagens enviadas aos endereços informados no preâmbulo deste contrato.

9.6 **Foro.** Fica eleito o Foro da Comarca de {{foro}} para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

E por estarem assim justas e acordadas, as Partes celebram o presente Contrato, que será assinado em formato eletrônico, cujas vias terão o mesmo teor e efeito.

> {{cidade}}, {{data_extenso}}.

{{assinaturas}}

---

# ANEXO I – DETALHAMENTO DOS SERVIÇOS DE {{servico_maiusculo}}

{{escopo}}

Este Anexo I integra o Contrato de Prestação de Serviços de {{servico}} assinado eletronicamente pelas Partes, com validade jurídica nos termos da MP 2.200-2/2001.
$tpl$
);
