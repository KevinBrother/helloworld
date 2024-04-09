-- MySQL dump 10.13  Distrib 5.7.37, for Linux (x86_64)
--
-- Host: localhost    Database: rpa_db
-- ------------------------------------------------------
-- Server version	5.7.37

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account_department_relation`
--

DROP TABLE IF EXISTS `account_department_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account_department_relation` (
  `relationID` int(11) NOT NULL AUTO_INCREMENT,
  `accountID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tenantID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `departmentID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  `deletedTime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`relationID`),
  KEY `ix_adr_aid` (`accountID`),
  KEY `ix_adr_did` (`departmentID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `account_role_relation`
--

DROP TABLE IF EXISTS `account_role_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account_role_relation` (
  `relationID` int(11) NOT NULL AUTO_INCREMENT,
  `accountID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tenantID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `roleID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  `deletedTime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`relationID`),
  KEY `ix_arr_aid` (`accountID`),
  KEY `ix_arr_rid` (`roleID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `account_tenant_relation`
--

DROP TABLE IF EXISTS `account_tenant_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `account_tenant_relation` (
  `relationID` int(11) NOT NULL AUTO_INCREMENT,
  `accountID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tenantID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `keySecret` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '租户账户状态 0(正常) 1(禁用) 2(删除)',
  `isOwner` int(11) NOT NULL DEFAULT '0' COMMENT '租户用户者',
  `isDefault` int(11) NOT NULL DEFAULT '0' COMMENT '用户登陆默认使用租户',
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  `deletedTime` int(11) NOT NULL DEFAULT '0',
  `activeTime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`relationID`),
  KEY `ix_atr_aid` (`accountID`),
  KEY `ix_atr_tid` (`tenantID`),
  KEY `un_atr_key` (`keySecret`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts` (
  `accountID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `accountEmail` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `accountName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `accountPassword` char(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '账户状态: 0(正常) 1(禁用) 2(删除) 3(待激活)',
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  `deletedTime` int(11) NOT NULL DEFAULT '0',
  `emailAuthTime` int(11) NOT NULL DEFAULT '0',
  `starBlocks` varchar(1024) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '[]',
  `failCount` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`accountID`),
  KEY `ix_a_name` (`accountName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `actions`
--

DROP TABLE IF EXISTS `actions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `actions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `resource` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `actions` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源操作表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `app_category`
--

DROP TABLE IF EXISTS `app_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_category` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `industryCategory` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdTime` bigint(20) DEFAULT '0' COMMENT '创建时间',
  `status` int(11) DEFAULT '1',
  `updatedTime` bigint(20) DEFAULT '0' COMMENT '更新时间',
  `number` int(11) DEFAULT '0',
  `color` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `app_statistics`
--

DROP TABLE IF EXISTS `app_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_statistics` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `appId` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '流程id',
  `date` int(11) NOT NULL COMMENT '日期（20221009）',
  `tenantId` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '租户id',
  `revenueSaved` bigint(20) unsigned DEFAULT '0' COMMENT '每日节省资金（元）',
  `timeSaved` bigint(20) unsigned DEFAULT '0' COMMENT '每日节省时长（秒）',
  `jobNums` int(10) unsigned DEFAULT '0' COMMENT '每日作业总数（次）',
  `totalRunningTime` int(10) unsigned DEFAULT '0' COMMENT '每日运行时长（秒）',
  `createdTime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `un_appId_date` (`appId`,`date`),
  KEY `ix_tenantId` (`tenantId`)
) ENGINE=InnoDB AUTO_INCREMENT=202 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='流程统计表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `app_versions`
--

DROP TABLE IF EXISTS `app_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_versions` (
  `appId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `version` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'DRAFT',
  `visualCode` longtext COLLATE utf8mb4_unicode_ci,
  `sourceCode` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `versionUrl` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `studioVersion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `updatedTime` int(11) DEFAULT '0' COMMENT '更新时间',
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `versionDescription` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `visualVars` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `subFlows` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `recentBlocks` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT '[]',
  `isShow` int(11) DEFAULT '1' COMMENT '是否展示',
  `flowDetail` varchar(4096) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `descriptionPicUrl` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `videoUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `completionDegree` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `status` int(11) NOT NULL DEFAULT '0',
  `versionId` int(11) NOT NULL AUTO_INCREMENT,
  `fileMd5` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '',
  `accountId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '',
  `outputParams` varchar(4096) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '[]' COMMENT '流程输出参数列表',
  `pipFlag` int(11) DEFAULT '0' COMMENT '是否支持画中画运行 1支持 0不支持',
  PRIMARY KEY (`versionId`),
  KEY `appId_version` (`appId`,`version`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `approval_nodes`
--

DROP TABLE IF EXISTS `approval_nodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `approval_nodes` (
  `nodeId` int(11) NOT NULL AUTO_INCREMENT,
  `nodeName` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `indexNode` int(11) NOT NULL DEFAULT '-1',
  `status` int(11) NOT NULL DEFAULT '-1',
  `approverInfo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`nodeId`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `apps`
--

DROP TABLE IF EXISTS `apps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `apps` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `appId` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `appName` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `appStatus` int(11) DEFAULT NULL,
  `type` int(11) DEFAULT NULL,
  `timesOfUse` int(11) DEFAULT NULL,
  `accountId` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `updatedTime` int(11) DEFAULT '0' COMMENT '更新时间',
  `industryCategory` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `isExample` int(11) DEFAULT NULL,
  `departmentId` mediumtext COLLATE utf8mb4_bin,
  `tenantId` char(36) COLLATE utf8mb4_bin DEFAULT NULL,
  `iconUrl` varchar(255) COLLATE utf8mb4_bin DEFAULT '',
  `exampleNumber` int(11) DEFAULT '0',
  `owner` mediumtext COLLATE utf8mb4_bin,
  `clientAppId` varchar(255) COLLATE utf8mb4_bin DEFAULT '',
  `avgRevenueSaved` int(11) DEFAULT '0' COMMENT '平均节省资金',
  `avgTimeSaved` int(11) DEFAULT '0' COMMENT '平均节省时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `ix_appId` (`appId`) USING BTREE,
  KEY `ix_tenantId` (`tenantId`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `apps_third_libs`
--

DROP TABLE IF EXISTS `apps_third_libs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `apps_third_libs` (
  `appId` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `thirdLibId` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`appId`,`thirdLibId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `asset_values`
--

DROP TABLE IF EXISTS `asset_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `asset_values` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `assetId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `accountId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `robotId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `updatedTime` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `assetId` (`assetId`,`accountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `assets` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL,
  `assetType` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `creator` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `owner` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `createdTime` int(11) NOT NULL,
  `updatedTime` int(11) NOT NULL,
  `tenantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `status` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_assets_tenantId_name` (`tenantId`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `audit_logs` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `userName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '用户名',
  `userEmail` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '用户邮箱',
  `operation` int(11) NOT NULL COMMENT '具体操作',
  `module` int(11) NOT NULL COMMENT '操作模块',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '描述信息',
  `createdTime` int(11) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `tenantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '租户ID',
  `ip` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT 'ip地址',
  `accountId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_al_createdTime` (`createdTime`),
  KEY `ix_al_operation` (`operation`),
  KEY `ix_al_module` (`module`)
) ENGINE=InnoDB AUTO_INCREMENT=419 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `button_route_relation`
--

DROP TABLE IF EXISTS `button_route_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `button_route_relation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `buttonId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `routeId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `button_route_uk` (`buttonId`,`routeId`)
) ENGINE=InnoDB AUTO_INCREMENT=215 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资源路由映射表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `buttons`
--

DROP TABLE IF EXISTS `buttons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `buttons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `parentId` int(11) NOT NULL DEFAULT '0',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `button_uk` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='按钮表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `calendars`
--

DROP TABLE IF EXISTS `calendars`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `calendars` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT 'ID',
  `name` varchar(255) CHARACTER SET utf8 COLLATE utf8_unicode_ci DEFAULT NULL,
  `tenantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'tenant id',
  `accountId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'account id',
  `status` int(11) DEFAULT '1' COMMENT '-1 已删除 1 可用',
  `createdTime` int(11) DEFAULT NULL,
  `updatedTime` int(11) DEFAULT NULL,
  `nonWorkingDays` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT '非工作日',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `department_role_relation`
--

DROP TABLE IF EXISTS `department_role_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `department_role_relation` (
  `relationID` int(11) NOT NULL AUTO_INCREMENT,
  `tenantID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `departmentID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `roleID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  `deletedTime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`relationID`),
  KEY `ix_drr_tid` (`tenantID`),
  KEY `ix_drr_did` (`departmentID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `departments`
--

DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `departments` (
  `departmentID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `departmentName` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tenantID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `parentID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '部门的上级ID 一级部门的上级ID是租户ID',
  `indexNum` int(11) DEFAULT '0' COMMENT '顺序',
  `icon` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  `deletedTime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`departmentID`),
  KEY `ix_d_pid` (`parentID`),
  KEY `ix_d_tid` (`tenantID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `devices`
--

DROP TABLE IF EXISTS `devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `devices` (
  `deviceId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '业务主键',
  `createdTime` int(11) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updatedTime` int(11) NOT NULL DEFAULT '0' COMMENT '更新时间',
  `hostName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '主机名称',
  `userName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '计算机当前登录的用户名',
  `machineId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '设备 id 由客户端自己上报，如机器人的 machine id、物理信息算出的哈希值等',
  `os` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '操作系统类型，如 windows、linux 等',
  `osVersion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'os 具体的版本信息',
  `hardwares` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT '设备的物理信息，如 mac、ip、remotePort，这些属性基本不会用来查询',
  `cpuRate` int(11) DEFAULT NULL COMMENT 'cpu 占用率',
  `memoryRate` int(11) DEFAULT NULL COMMENT 'memory 占用率',
  `diskRate` int(11) DEFAULT NULL COMMENT '磁盘速率',
  `netSpeed` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '网速',
  `ip` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'ip',
  `mac` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'mac',
  `remotePort` int(11) DEFAULT '0' COMMENT '远程连接端口',
  PRIMARY KEY (`deviceId`),
  UNIQUE KEY `machineId_userName` (`machineId`,`userName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `element_versions`
--

DROP TABLE IF EXISTS `element_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `element_versions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `accountID` char(36) COLLATE utf8mb4_bin NOT NULL,
  `elementID` char(36) COLLATE utf8mb4_bin NOT NULL,
  `version` char(36) COLLATE utf8mb4_bin NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '控件描述',
  `createdTime` int(11) DEFAULT '0' COMMENT '创建时间',
  `updatedTime` int(11) DEFAULT '0' COMMENT '更新时间',
  `deletedTime` int(11) DEFAULT '0' COMMENT '删除时间',
  `status` int(11) DEFAULT '1' COMMENT '-1 已删除 1 正常',
  `fileUrl` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '文件路径',
  `fileMd5` char(36) COLLATE utf8mb4_bin DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `ix_elementId` (`elementID`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='控件版本表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `elements`
--

DROP TABLE IF EXISTS `elements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `elements` (
  `elementID` char(36) COLLATE utf8mb4_bin NOT NULL,
  `tenantID` char(36) COLLATE utf8mb4_bin NOT NULL,
  `accountID` char(36) COLLATE utf8mb4_bin NOT NULL,
  `owner` mediumtext COLLATE utf8mb4_bin COMMENT '控件拥有者',
  `createdTime` int(11) DEFAULT '0' COMMENT '创建时间',
  `deletedTime` int(11) DEFAULT '0' COMMENT '删除时间',
  `updatedTime` int(11) DEFAULT '0' COMMENT '更新时间',
  `status` int(11) DEFAULT '1' COMMENT '-1 已删除 1 正常',
  `elementName` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '控件名称',
  `description` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '控件描述',
  PRIMARY KEY (`elementID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='控件表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_log`
--

DROP TABLE IF EXISTS `job_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `jobId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `log` text COLLATE utf8mb4_unicode_ci,
  `createdTime` int(11) DEFAULT NULL,
  `updatedTime` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_job_log_jobId` (`jobId`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_nodes`
--

DROP TABLE IF EXISTS `job_nodes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_nodes` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `jobId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '作业id',
  `nodeIndex` int(11) NOT NULL COMMENT '节点编号',
  `nodeName` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '节点名称',
  `nodeStatus` int(11) NOT NULL DEFAULT '0' COMMENT '状态;0运行中 1 警告 2 出错 3 完成',
  `detail` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '节点描述信息',
  `startTime` int(11) NOT NULL DEFAULT '0' COMMENT '开始时间',
  `endTime` int(11) NOT NULL DEFAULT '0' COMMENT '结束时间',
  PRIMARY KEY (`id`),
  KEY `ix_job_node_jobId` (`jobId`)
) ENGINE=InnoDB AUTO_INCREMENT=240 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_timestamps`
--

DROP TABLE IF EXISTS `job_timestamps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_timestamps` (
  `jobId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `updatedTime` int(11) DEFAULT NULL,
  PRIMARY KEY (`jobId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `job_video_pictures`
--

DROP TABLE IF EXISTS `job_video_pictures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `job_video_pictures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `jobId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '作业 id',
  `fileType` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '类型，只允许 picture 或者 video,不知道 tdsql 是否支持 set，故使用字符串',
  `md5` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件 md5',
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件 url',
  `createdTime` int(11) NOT NULL DEFAULT '0' COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `ix_jobId` (`jobId`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `jobs`
--

DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `jobs` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `jobId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '业务id',
  `taskId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务id',
  `jobIndex` int(11) DEFAULT '0' COMMENT '作业编号',
  `jobName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务名称',
  `batch` int(11) DEFAULT '0' COMMENT '批次',
  `startTime` int(11) DEFAULT '0' COMMENT '开始时间',
  `endTime` int(11) DEFAULT '0' COMMENT '结束时间',
  `status` int(11) DEFAULT '0' COMMENT '状态;-3创建 100完成 101 终止中 102终止完成103 暂停 -1失败 1执行中',
  `robotId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '机器人id',
  `robotName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '机器人名称',
  `totalNodes` int(11) DEFAULT '0' COMMENT '总节点数',
  `completedNodes` int(11) DEFAULT '0' COMMENT '已完成节点数',
  `createdTime` int(11) DEFAULT NULL COMMENT '创建',
  `planTime` int(11) DEFAULT '0' COMMENT '计划时间',
  `filePath` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '结果文件地址',
  `updatedTime` int(11) DEFAULT '0' COMMENT '更新时间',
  `apiVars` varchar(4096) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'API接口传参',
  `visualVars` text COLLATE utf8mb4_unicode_ci COMMENT '手动任务输入参数',
  `outputParams` text COLLATE utf8mb4_unicode_ci COMMENT '输出参数',
  `appFileMd5` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '流程MD5值',
  `parentJobId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '父级作业',
  `appId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '流程id',
  `appName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '流程名称',
  `appVersion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '流程版本',
  `appType` int(11) DEFAULT NULL COMMENT '流程类型',
  `pipFlag` int(11) DEFAULT NULL COMMENT '流程画中画运行标识',
  `appVersionUrl` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '流程下载地址',
  `scheduleType` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '调度类型',
  `accountName` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '用户名称',
  `revenueSaved` int(11) DEFAULT '0' COMMENT '节省收益',
  `timeSaved` int(11) DEFAULT '0' COMMENT '节省时间',
  `recordFlag` int(11) DEFAULT '0' COMMENT '录屏标识',
  `screenShotFlag` int(11) DEFAULT '0' COMMENT '截图标识',
  `isJobVarsEnabled` int(11) DEFAULT '0' COMMENT '是否启用作业参数',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户id',
  `departmentId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门Id',
  `accountId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `smsFlag` int(11) DEFAULT '0',
  `receiver` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isDistribute` int(11) DEFAULT '0',
  `scheduleValue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_job` (`taskId`,`jobIndex`),
  KEY `ix_jobs_robotId` (`robotId`),
  KEY `ix_jobs_planTIme` (`planTime`),
  KEY `ix_jobs_jobId` (`jobId`),
  KEY `ix_jobs_tenantId` (`tenantId`)
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lib_versions`
--

DROP TABLE IF EXISTS `lib_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `lib_versions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `libId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `version` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `publisherId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '',
  `fileUrl` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '' COMMENT '库文件存储地址',
  `fileMd5` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '',
  `depends` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `status` int(11) DEFAULT '1' COMMENT '-1 已删除 1 可用',
  `createdTime` bigint(20) DEFAULT '0' COMMENT '创建时间',
  `updatedTime` bigint(20) DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `lib_versions.ix_lib` (`libId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `libs`
--

DROP TABLE IF EXISTS `libs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `libs` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tenantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `creatorId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `clientLibId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '' COMMENT '流程库的客户端 ID',
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '',
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '' COMMENT 'visual/code/third',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '',
  `status` int(11) DEFAULT '1' COMMENT '-1 已删除 1 可用',
  `createdTime` bigint(20) DEFAULT '0' COMMENT '创建时间',
  `updatedTime` bigint(20) DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `libs.ix_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `log`
--

DROP TABLE IF EXISTS `log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `log` (
  `id` varchar(255) COLLATE utf8_bin NOT NULL,
  `logContent` varchar(255) COLLATE utf8_bin DEFAULT NULL,
  `logType` int(11) DEFAULT NULL,
  `createdTime` int(11) DEFAULT NULL,
  `logLevel` int(11) DEFAULT NULL,
  `eventId` varchar(255) COLLATE utf8_bin DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_log_createdTime` (`createdTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `mail_config`
--

DROP TABLE IF EXISTS `mail_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `mail_config` (
  `id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `eventType` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `notify` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `mailAccount` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `recvMail` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `tenantId` char(36) COLLATE utf8mb4_bin NOT NULL,
  `createTime` int(11) NOT NULL DEFAULT '0',
  `updateTime` int(11) NOT NULL DEFAULT '0',
  `deleteTime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `ix_tid` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='邮件通知配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `operation_flows`
--

DROP TABLE IF EXISTS `operation_flows`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `operation_flows` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `description` varchar(4000) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '流程简介',
  `img` varchar(2400) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '流程介绍图片 json, [{"name":"name1","url":"url1"},{"name":"name2","url":"url2"}]',
  `video` varchar(400) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '流程介绍视频 json, {"name":"name1","url":"url1"}',
  `createdTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updatedTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '更新时间',
  `deletedTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `operation_mall_app_tasks`
--

DROP TABLE IF EXISTS `operation_mall_app_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `operation_mall_app_tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mallAppId` int(11) NOT NULL COMMENT '应用 id',
  `accountId` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '用户 id',
  `taskId` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '任务 id',
  `taskType` int(11) NOT NULL COMMENT '任务类型, 1: 手动, 2: 定时',
  `createdTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updatedTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '更新时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `ix_mat_mid` (`mallAppId`,`accountId`,`taskType`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `operation_mall_apps`
--

DROP TABLE IF EXISTS `operation_mall_apps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `operation_mall_apps` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'id',
  `name` varchar(50) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '名称',
  `number` int(11) NOT NULL COMMENT '编号',
  `description` varchar(300) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '描述',
  `appId` char(36) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '流程id',
  `appVersionId` int(11) NOT NULL DEFAULT '0' COMMENT '流程版本',
  `robotIds` varchar(2000) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '多机器人id',
  `departmentIds` varchar(2000) COLLATE utf8mb4_bin DEFAULT '' COMMENT '多部门id,已弃用',
  `status` varchar(20) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '状态:未上架(not_apply),待审核(wait_check),未通过(check_fail),已上架(on_shelf),已下架(off_shelf)',
  `latestMallReleaseAppId` int(11) NOT NULL DEFAULT '0' COMMENT '最新发布版本',
  `createdByTenantId` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '创建人租户id',
  `createdByAccountId` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '创建人账户id',
  `createdByUserName` varchar(30) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '创建人名字',
  `appliedTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '申请审批时间',
  `recordFlag` tinyint(1) NOT NULL DEFAULT '0' COMMENT '作业执行中，是否录制计算机屏幕',
  `screenShotFlag` tinyint(1) NOT NULL DEFAULT '0' COMMENT '作业异常时，是否截取计算机屏幕',
  `smsFlag` tinyint(1) NOT NULL DEFAULT '0' COMMENT '作业异常时，是否短信通知用户',
  `smsReceiver` char(11) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '短信接受号码',
  `tagId` int(11) NOT NULL DEFAULT '0' COMMENT '导航 id',
  `coverImg` varchar(400) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '封面图片 json, {"name":"name1","url":"url1"}',
  `flowId` int(11) NOT NULL DEFAULT '0' COMMENT '流程介绍 id',
  `createdTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updatedTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '更新时间',
  `deletedTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '删除时间',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `ix_mla_number` (`number`),
  KEY `ix_mla_tid_aid` (`createdByTenantId`,`createdByAccountId`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `operation_tags`
--

DROP TABLE IF EXISTS `operation_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `operation_tags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '标签名称',
  `createdTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updatedTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '更新时间',
  `orderNum` int(11) NOT NULL COMMENT '排序编号',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin ROW_FORMAT=DYNAMIC;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `roleId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tenantId` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `dataId` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `action` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `resource` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permission_uk` (`roleId`,`dataId`,`action`,`resource`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='权限表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `process`
--

DROP TABLE IF EXISTS `process`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `process` (
  `processId` char(36) COLLATE utf8mb4_bin NOT NULL,
  `status` int(11) DEFAULT '0',
  `name` varchar(255) COLLATE utf8mb4_bin DEFAULT '',
  `accountId` char(36) COLLATE utf8mb4_bin DEFAULT '',
  `createdTime` int(11) DEFAULT '0',
  `url` varchar(255) COLLATE utf8mb4_bin DEFAULT '',
  PRIMARY KEY (`processId`),
  UNIQUE KEY `uk_assets_tenantId_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `requirement_comments`
--

DROP TABLE IF EXISTS `requirement_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `requirement_comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `requirementID` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '需求ID',
  `step` int(11) NOT NULL COMMENT '处理流程',
  `type` int(11) NOT NULL COMMENT '1（处理），0（评论），2（转交）',
  `updatedTime` bigint(20) DEFAULT '0' COMMENT '更新时间',
  `commenterID` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '评论者ID',
  `recipientID` char(36) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '接收者ID',
  `opinion` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '意见',
  `filePath` varchar(4096) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '上传附件',
  `appId` int(11) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `requirements`
--

DROP TABLE IF EXISTS `requirements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `requirements` (
  `id` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '需求ID',
  `requirementName` varchar(255) COLLATE utf8mb4_bin NOT NULL COMMENT '需求名称',
  `tenantID` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '租户ID',
  `accountID` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '创建者ID',
  `status` int(11) NOT NULL DEFAULT '1' COMMENT '需求状态：-1（已删除），0（关闭），1（开启）',
  `applicableDepartments` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '适用对象',
  `createdTime` bigint(20) DEFAULT '0' COMMENT '创建时间',
  `osAndSoftware` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '系统软件',
  `description` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '场景描述',
  `appProcedure` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '流程步骤',
  `filePath` varchar(4096) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '上传附件',
  `currentStep` int(11) NOT NULL COMMENT '当前处理流程',
  `currentAuditorID` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '当前经办人ID',
  `updatedTime` bigint(20) DEFAULT '0' COMMENT '更新时间',
  `allRelevantPersonnel` varchar(1024) COLLATE utf8mb4_bin NOT NULL COMMENT '需求所有相关人员',
  `passedAuditor` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '已处理需求人员',
  `appId` int(11) DEFAULT '0',
  `osAndCPU` char(250) COLLATE utf8mb4_bin NOT NULL,
  `software` char(250) COLLATE utf8mb4_bin NOT NULL,
  `currentStepName` char(250) COLLATE utf8mb4_bin NOT NULL,
  `processesJson` char(250) COLLATE utf8mb4_bin NOT NULL,
  `labelId` int(11) DEFAULT '0',
  `stepNum` int(11) DEFAULT '0',
  `isFinish` int(11) DEFAULT '0',
  `otherFilePath` char(250) COLLATE utf8mb4_bin NOT NULL,
  `label` int(11) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `revenues`
--

DROP TABLE IF EXISTS `revenues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `revenues` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `revenueTime` int(11) DEFAULT '0' COMMENT '节省时间',
  `revenueMoney` int(11) DEFAULT '0' COMMENT '节省资金',
  `tenantId` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '租户id',
  PRIMARY KEY (`id`,`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `robot_account_relation`
--

DROP TABLE IF EXISTS `robot_account_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `robot_account_relation` (
  `robotId` char(36) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '机器人表的 robotId',
  `accountId` char(36) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '机器人归属的用户 account id',
  `tenantId` char(36) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `id` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id`),
  KEY `robotId` (`robotId`),
  KEY `accountId` (`accountId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='机器人与账户关系表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `robot_config`
--

DROP TABLE IF EXISTS `robot_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `robot_config` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `robotId` char(36) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '机器人 id',
  `cpuThreshold` int(11) DEFAULT '90' COMMENT 'cpu使用率告警阈值',
  `memThreshold` int(11) DEFAULT '90' COMMENT '内存使用率告警阈值',
  `diskThreshold` int(11) DEFAULT '90' COMMENT 'disk使用率告警阈值',
  `alertEmailReceiver` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '邮件告警收件地址',
  `alertSmsReceiver` varchar(255) COLLATE utf8mb4_bin NOT NULL DEFAULT '' COMMENT '短信告警收信号码',
  `lastAlertEmailTime` int(10) unsigned DEFAULT '0' COMMENT '上次硬件信息邮件告警时间',
  `lastAlertSmsTime` int(10) unsigned DEFAULT '0' COMMENT '上次硬件信息短信告警时间',
  `isOfflineNotifyEnabled` tinyint(1) DEFAULT '0' COMMENT '是否离线告警, 1 是，0 否',
  `createdTime` int(11) NOT NULL COMMENT '记录创建时间',
  `updatedTime` int(11) NOT NULL COMMENT '更新记录时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `robotId` (`robotId`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='机器人配置表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `robot_department_relation`
--

DROP TABLE IF EXISTS `robot_department_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `robot_department_relation` (
  `robotId` char(36) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '机器人表的 robotId',
  `departmentId` char(36) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '机器人归属的部门 id',
  KEY `robotId` (`robotId`),
  KEY `departmentId` (`departmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='机器人与部门关系表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `robot_group_relation`
--

DROP TABLE IF EXISTS `robot_group_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `robot_group_relation` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `groupId` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '机器人组id',
  `robotId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '机器人id',
  `createdTime` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updatedTime` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  `deletedTime` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '删除时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `robot_group_relation_groupId_robotId_uindex` (`groupId`,`robotId`),
  KEY `ix_groupId` (`groupId`) USING BTREE,
  KEY `ix_robotId` (`robotId`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人和机器人组中间表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `robot_groups`
--

DROP TABLE IF EXISTS `robot_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `robot_groups` (
  `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `groupId` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` int(11) NOT NULL DEFAULT '0',
  `name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '组名称',
  `description` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '描述',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '租户id',
  `accountId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '' COMMENT '用户id',
  `robotsNum` smallint(5) unsigned NOT NULL DEFAULT '0' COMMENT '机器人数量',
  `createdTime` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '创建时间',
  `updatedTime` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '更新时间',
  `deletedTime` int(10) unsigned NOT NULL DEFAULT '0' COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `ix_groupId` (`groupId`) USING BTREE,
  KEY `ix_accountId` (`accountId`) USING BTREE,
  KEY `ix_tenantId` (`tenantId`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='机器人组';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `robot_statistics`
--

DROP TABLE IF EXISTS `robot_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `robot_statistics` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `robotId` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '机器人id',
  `date` int(11) NOT NULL COMMENT '日期（20221009）',
  `tenantId` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '租户id',
  `revenueSaved` bigint(20) unsigned DEFAULT '0' COMMENT '每日节省资金（元）',
  `timeSaved` bigint(20) unsigned DEFAULT '0' COMMENT '每日节省时长（秒）',
  `jobNums` int(10) unsigned DEFAULT '0' COMMENT '每日作业次数（次）',
  `totalRunningTime` int(10) unsigned DEFAULT '0' COMMENT '每日运行时长（秒）',
  `createdTime` datetime DEFAULT NULL COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `un_robotId_date` (`robotId`,`date`),
  KEY `ix_tenantId` (`tenantId`)
) ENGINE=InnoDB AUTO_INCREMENT=185 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='机器人统计表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `robots`
--

DROP TABLE IF EXISTS `robots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `robots` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `robotId` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '业务主键，其它表关联机器人表时，使用该字段关联',
  `createdTime` int(11) DEFAULT NULL COMMENT '机器人创建时间',
  `updatedTime` int(11) DEFAULT NULL COMMENT '更新记录时间',
  `lastHeartBeatTime` int(11) DEFAULT NULL COMMENT '机器人最近一次上报时间，如果机器人主动下线，则该字段置为 -1',
  `recentOnlineTime` int(11) NOT NULL DEFAULT '0' COMMENT '机器人最近在线时间，需求要求展示该字段',
  `inBlackList` int(11) DEFAULT NULL COMMENT '是否在黑名单',
  `status` int(11) DEFAULT NULL COMMENT '0 审核中、1 审核失败、2 启用、3 禁用，启用和禁用的前提是机器人已经被审核通过',
  `currentAccountId` varchar(36) COLLATE utf8mb4_bin DEFAULT '' COMMENT '当前登录用户 id；离线时清空该字段',
  `version` varchar(255) COLLATE utf8mb4_bin DEFAULT '' COMMENT '机器人版本',
  `name` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '机器人名称',
  `expireTime` bigint(20) DEFAULT NULL COMMENT '机器人 license 过期时间， 如果没有 license，则存储 -1',
  `tenantId` char(36) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '机器人记录租户 id 用来统计',
  `deviceId` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '关联 device 表',
  `keySecret` char(36) COLLATE utf8mb4_bin DEFAULT NULL,
  `lastNotifyStatus` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `robots_robotId` (`robotId`),
  UNIQUE KEY `robots_tenantId_name_uindex` (`tenantId`,`name`),
  KEY `tenant_device_id` (`tenantId`,`deviceId`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='机器人表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `roleID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `roleName` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `parentID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tenantID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `isAdmin` int(11) DEFAULT '0',
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  `deletedTime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`roleID`),
  KEY `ix_tid` (`tenantID`),
  KEY `ix_pid` (`parentID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='角色表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `routes`
--

DROP TABLE IF EXISTS `routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `routes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `route` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `method` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `routes_uk` (`route`,`method`)
) ENGINE=InnoDB AUTO_INCREMENT=232 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='后端路由表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `studios`
--

DROP TABLE IF EXISTS `studios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `studios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `deviceId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '设备 ID，与 devices 关联',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `accountId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '最近一次登录开发平台的用户 ID',
  `lastHeartbeatTime` int(11) NOT NULL DEFAULT '0' COMMENT '开发平台最新心跳时间',
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `studios_deviceId_tenantId` (`deviceId`,`tenantId`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `system_configs`
--

DROP TABLE IF EXISTS `system_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system_configs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `server` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `confKey` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `value` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sc_server_confKey` (`server`,`confKey`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `task_runner_relation`
--

DROP TABLE IF EXISTS `task_runner_relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `task_runner_relation` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `taskId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务Id',
  `runnerId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '机器人Id/机器人',
  `createdTime` int(11) DEFAULT NULL COMMENT '创建时间',
  `updatedTime` int(11) DEFAULT NULL COMMENT '更新时间',
  `type` int(11) DEFAULT NULL COMMENT '类型;1 指定机器人 2 机器人组',
  PRIMARY KEY (`id`),
  KEY `ix_runner_taskId` (`taskId`),
  KEY `ix_runnerId` (`runnerId`)
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `taskId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务Id',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '任务名称',
  `scheduleType` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '调度类型',
  `scheduleValue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '调度值',
  `accountId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '创建者',
  `status` int(11) DEFAULT '0' COMMENT '状态;启用 1 禁用 2',
  `createdTime` int(11) DEFAULT '0' COMMENT '创建时间',
  `updatedTime` int(11) DEFAULT '0' COMMENT '更新时间',
  `nextExecuteTime` int(11) DEFAULT NULL COMMENT '下次执行时间',
  `scheduleStartTime` int(11) DEFAULT '0' COMMENT '首次计划执行时间',
  `departmentId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '部门id',
  `appId` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '流程主键',
  `appVersion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '流程版本',
  `appType` int(11) DEFAULT '1' COMMENT '流程类型',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '租户id',
  `recordFlag` int(11) DEFAULT '0' COMMENT '是否录屏;1录屏 0不录屏',
  `screenShotFlag` int(11) DEFAULT '0' COMMENT '是否异常截图;1截图0 不截图',
  `smsFlag` int(11) DEFAULT '0' COMMENT '是否发短信;1发送 0不发送',
  `receiver` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '短信接收者;json字符串',
  `terminateTime` int(11) DEFAULT '0' COMMENT '设定的任务终止时间',
  `currentDistributeBatch` int(11) DEFAULT NULL COMMENT '当前批次',
  `isDistributeBatchFinished` int(11) DEFAULT NULL COMMENT '批次是否完成',
  `distributeNumber` int(11) DEFAULT '0' COMMENT '动态分配次数',
  `freeTime` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '非工作时间段;json字符串',
  `calendarId` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '日历id',
  `isJobVarsEnabled` int(11) DEFAULT '0' COMMENT '是否启用手动输入参数功能;0不启用1启用',
  `sharedFromTaskId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分享自任务Id',
  `userId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '任务使用者Id',
  `isDistribute` int(11) DEFAULT NULL,
  `parentTaskId` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isShow` int(11) DEFAULT NULL,
  `visualVars` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `ix_taskId` (`taskId`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tenant_licenses`
--

DROP TABLE IF EXISTS `tenant_licenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_licenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '主键',
  `tenantId` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '租户 ID',
  `studioCount` int(11) NOT NULL DEFAULT '0' COMMENT '开发平台连接数',
  `robotCount` int(11) NOT NULL DEFAULT '0' COMMENT '机器人连接数',
  `expireTime` bigint(20) NOT NULL DEFAULT '0' COMMENT '过期时间',
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenantId` (`tenantId`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tenant_statistics`
--

DROP TABLE IF EXISTS `tenant_statistics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_statistics` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增id',
  `tenantId` char(36) COLLATE utf8mb4_bin NOT NULL COMMENT '租户id',
  `date` int(11) NOT NULL COMMENT '日期（20221009）',
  `totalRunningTime` int(10) unsigned DEFAULT '0' COMMENT '每日运行时长（秒）',
  `jobNums` int(10) unsigned DEFAULT '0' COMMENT '每日作业总数（次）',
  `completedNums` int(10) unsigned DEFAULT '0' COMMENT '每日作业完成总数（次）',
  `successNums` int(10) unsigned DEFAULT '0' COMMENT '每日成功作业总数（次）',
  `errorNums` int(10) unsigned DEFAULT '0' COMMENT '每日异常作业总数（次）',
  `revenueSaved` bigint(20) unsigned DEFAULT '0' COMMENT '每日节省资金（元）',
  `timeSaved` bigint(20) unsigned DEFAULT '0' COMMENT '每日节省时长（秒）',
  `createdTime` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `un_tenantId_date` (`tenantId`,`date`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin COMMENT='租户统计表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tenantID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `tenantName` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '租户名称',
  `parentID` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '上级租户iD,如果没有上级租户ID,自己为自己的上级',
  `status` int(11) NOT NULL DEFAULT '0' COMMENT '0(正常) 1(禁用) 2(删除)',
  `createdTime` int(11) NOT NULL DEFAULT '0',
  `updatedTime` int(11) NOT NULL DEFAULT '0',
  `deletedTime` int(11) NOT NULL DEFAULT '0',
  `keySecret` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `ix_t_idx` (`tenantID`,`parentID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `third_lib`
--

DROP TABLE IF EXISTS `third_lib`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `third_lib` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `osVersion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `author` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdTime` bigint(20) NOT NULL,
  `path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-04-09  6:54:19
