# Brouillon du chapitre « Les états trimestriels »

> À insérer dans `Manuel_utilisation_Log_Integrite.docx`, dans la partie administrateur, juste après « La corbeille des personnes » (et, côté validateur, une phrase de renvoi). Les captures sont à prendre sur la VM une fois le déploiement fait. Ne pas ajouter ce chapitre avant que la page existe en production.

---

## Les états trimestriels

**Pour qui ?** L'administrateur et le validateur. L'agent de saisie et le consultant ne voient pas cette page.

**À quoi ça sert ?** Chaque trimestre, l'ASCE-LC remet à sa hiérarchie un état officiel des personnes fichées, c'est-à-dire des personnes inscrites au registre officiel. L'application le prépare automatiquement et le conserve, tel qu'il a été remis : on peut ainsi retrouver à tout moment l'état d'un trimestre passé, même si les données ont changé depuis.

### Où le trouver

Dans le menu de gauche, section **Pilotage**, cliquez sur **États trimestriels**.

*[Capture 1 : le menu avec l'entrée « États trimestriels » et la page ouverte]*

### Lire le tableau

Chaque ligne est un état archivé :

| Colonne | Ce qu'elle signifie |
|---|---|
| Période | Le trimestre concerné, par exemple « T3 2026 » (juillet à septembre). |
| Date d'arrêt | Le dernier jour du trimestre, par exemple 30/09/2026. |
| Établi le | Le jour où l'état a été réellement produit. |
| Généré par | « SYSTEME » quand l'état est produit automatiquement, sinon le nom de l'administrateur. |
| Personnes | Le nombre de personnes fichées dans l'état. |
| Empreinte PDF | Les 12 premiers caractères d'un code qui identifie le fichier : si le PDF était modifié, le code changerait. Passez la souris dessus pour voir le code complet. |

**Date d'arrêt et « Établi le » sont différentes.** L'état d'un trimestre est produit au début du trimestre suivant : celui du T3 2026 est établi début octobre. La liste des personnes reflète le registre au moment où l'état est établi.

Un état marqué **« remplacé »** est une ancienne version, gardée pour mémoire. Elle reste téléchargeable, mais c'est la ligne sans cette mention qui fait foi.

*[Capture 2 : le tableau avec un état actif et un état « remplacé »]*

### Télécharger un état

Cliquez sur **PDF** pour le document officiel à remettre à la hiérarchie, ou sur **Excel** pour travailler sur les données (filtrer, trier, recouper).

Le PDF contient :
- l'en-tête avec le trimestre, la date d'arrêt et la date d'établissement ;
- une **synthèse** : nombre de personnes fichées, nouvelles personnes fichées, personnes sorties du registre, changements de statut judiciaire, dossiers clos pendant le trimestre ;
- la **liste complète** des personnes fichées.

Pour le tout premier état, la synthèse indique « premier état » : il n'y a pas d'état précédent avec lequel comparer.

*[Capture 3 : première page d'un PDF d'état trimestriel]*

### La génération automatique

Vous n'avez rien à faire : l'application vérifie chaque jour que l'état du trimestre écoulé existe, et le produit s'il manque. Si le serveur était éteint à la fin du trimestre, l'état est produit dès qu'il redémarre.

### Générer un état à la demande (administrateur seulement)

Utile si la hiérarchie demande un état en cours de route ou si une erreur a été corrigée dans les données.

1. Choisissez le **trimestre** dans la liste (seuls les trimestres terminés sont proposés).
2. Cliquez sur **Générer maintenant**.
3. Confirmez. Si un état existe déjà pour ce trimestre, il est conservé et marqué « remplacé ».

**Limite :** un trimestre peut être régénéré **3 fois au maximum**. Au-delà, l'application affiche un message et refuse. Réfléchissez donc avant de régénérer : corrigez d'abord les données, puis générez une seule fois.

*[Capture 4 : la fenêtre de confirmation « Générer l'état T3 2026 »]*

### À retenir

- L'état est produit automatiquement chaque trimestre : on le télécharge, on ne le fabrique pas à la main.
- Un état archivé n'est jamais supprimé ni modifié.
- Seul l'administrateur peut en générer un à la demande, 3 fois au plus par trimestre.

### Exercice

En tant qu'administrateur : ouvrez **États trimestriels**, téléchargez le PDF du dernier état, et retrouvez dans la synthèse le nombre de personnes fichées. Comparez-le au nombre affiché dans **Répertoire officiel**. Les deux nombres sont-ils les mêmes ? Si non, expliquez pourquoi (pensez à la différence entre la date d'arrêt et la date « Établi le »).
