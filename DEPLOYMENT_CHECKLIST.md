# LMS SaaS Deployment Checklist

## ✅ Pre-Deployment
- [ ] Code is tested locally
- [ ] All features working (login, attendance, invites)
- [ ] GitHub repo is up to date
- [ ] Email configuration verified
- [ ] No hardcoded credentials in code

## ✅ Server Setup
- [ ] Hetzner account created
- [ ] VPS ordered (€2.99/month)
- [ ] SSH key generated and added
- [ ] Server IP noted

## ✅ Server Configuration
- [ ] SSH into server ✓
- [ ] System updated (`apt-get update`)
- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Node.js 18 installed
- [ ] Nginx installed
- [ ] Git installed

## ✅ Application Deployment
- [ ] Repository cloned to /opt/lms
- [ ] .env.production created with all variables
- [ ] Docker image built successfully
- [ ] Containers running (`docker ps`)
- [ ] API responding (`curl /api/v1/health`)

## ✅ SSL & Networking
- [ ] Nginx configured as reverse proxy
- [ ] Domain registered (optional)
- [ ] DNS pointing to server IP
- [ ] SSL certificate issued (Let's Encrypt)
- [ ] HTTPS working

## ✅ Testing
- [ ] Frontend loads
- [ ] Login works
- [ ] Attendance page functions
- [ ] Email sending works
- [ ] Invite links generate correctly

## ✅ Monitoring
- [ ] Logs checked for errors
- [ ] Services set to auto-restart
- [ ] Health checks active

## ✅ Post-Deployment
- [ ] Create initial admin user
- [ ] Send test invites to team
- [ ] Monitor for 24 hours
- [ ] Backup database setup
- [ ] Document any custom configs

---

**Estimated Time**: 1-2 hours first time
**Estimated Cost**: €2.99/month (or ~$4 with domain)
