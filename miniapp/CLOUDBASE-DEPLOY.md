# SUTA 云端功能部署清单

当前环境：`suta-5678-suta-d6gz0kudfc88b8e25`

## 1. 创建数据库集合

在腾讯云 CloudBase 控制台的当前环境中创建：

- `forum_posts`
- `forum_comments`
- `forum_likes`
- `forum_notifications`
- `user_profiles`
- `feedback`
- `teams`
- `team_members`
- `team_encouragements`

论坛帖子和评论允许登录用户读取，但不要允许小程序客户端直接写入；写入统一由云函数完成。其余集合关闭客户端直接写入，敏感集合也关闭客户端直接读取。

## 2. 建议索引

- `forum_posts`：`createdAt` 降序；复合索引 `category` 升序 + `createdAt` 降序；复合索引 `_openid` 升序 + `createdAt` 降序
- `forum_comments`：复合索引 `postId` 升序 + `createdAt` 升序
- `forum_likes`：复合索引 `postId` 升序 + `_openid` 升序
- `forum_notifications`：复合索引 `ownerId` 升序 + `createdAt` 降序；复合索引 `ownerId` 升序 + `read` 升序
- `teams`：`inviteCode` 升序（建议唯一）
- `team_members`：复合索引 `userId` 升序 + `teamId` 升序；`teamId` 升序
- `team_encouragements`：复合索引 `teamId` 升序 + `userId` 升序
- `feedback`：`createdAt` 降序

## 3. 上传并部署云函数

在微信开发者工具中依次右键云函数目录，选择“上传并部署：云端安装依赖”：

1. `forumHub`
2. `forumPostManager`
3. `toggleForumLike`
4. `teamHub`

部署后进入每个函数的云端详情确认状态正常，再分别测试论坛发帖、点赞、评论、创建队伍和邀请码加入。

## 4. 云存储与隐私配置

- 确认登录用户能上传并读取头像及论坛图片。
- 在微信公众平台填写《小程序用户隐私保护指引》，声明昵称头像、相册/相机图片及用户主动发布内容的用途。
- 发布前接入微信内容安全能力审核论坛文字和图片，并准备举报处理流程。

## 5. 反馈管理

用户从“我的 → 设置与反馈 → 反馈中心”提交后，管理员进入 CloudBase 数据库的 `feedback` 集合查看。字段包括用户唯一 ID、反馈正文、可选联系方式、处理状态和提交时间。处理完成后可把 `status` 从“待处理”改为“已处理”。

## 6. 支付与会员

钱包页面目前只展示结构，不会产生真实充值或扣款。上线支付前必须完成小程序认证、微信支付商户号申请与绑定、服务端下单、支付结果验签、退款规则和订单记录，不能只在前端修改余额。

## 7. 关注、粉丝与私信

新增以下数据库集合，并把三个集合的权限都设为“无权限（ADMINONLY）”。小程序端不能直接读写，所有操作统一由 `socialHub` 云函数校验当前微信用户身份后完成。

- `user_follows`
- `direct_threads`
- `direct_messages`

新增索引：

- `user_follows`：`followerId` 升序 + `followingId` 升序（建议唯一）；另建 `followingId` 升序
- `direct_threads`：`participants` 升序
- `direct_messages`：`threadId` 升序 + `createdAt` 升序；`receiverId` 升序 + `read` 升序；`senderId` 升序 + `createdAt` 降序

然后在微信开发者工具中右键 `cloudfunctions/socialHub`，选择“上传并部署：云端安装依赖”。部署完成后再上传体验版。

当前私信安全规则：用户只能读取自己参与的会话；关注对方后才能发起私信；每分钟最多发送 10 条；聊天页可举报，举报记录进入 `feedback` 集合，由管理员在 CloudBase 后台处理。
