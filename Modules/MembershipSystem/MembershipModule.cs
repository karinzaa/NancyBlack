﻿using Nancy;
using Nancy.ModelBinding;
using Nancy.Authentication.Forms;
using Nancy.Security;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Runtime.Caching;
using NantCom.NancyBlack.Modules.DatabaseSystem;
using Newtonsoft.Json;

namespace NantCom.NancyBlack.Modules.MembershipSystem
{
    public class MembershipModule : NancyBlack.Modules.BaseModule
    {
        private class LoginParams
        {
            /// <summary>
            /// Email
            /// </summary>
            public string Email { get; set; }

            /// <summary>
            /// User's Password
            /// </summary>
            public string Password { get; set; }

            /// <summary>
            /// Whether to always log-in user
            /// </summary>
            public bool RememberMe { get; set; }
        }
        
        public MembershipModule( IRootPathProvider r) : base( r )
        {
            Post["/membership/login"] = p =>
            {
                var loginParams = this.Bind<LoginParams>();
                dynamic user = this.SiteDatabase.Query("User",
                                string.Format("(Email eq '{0}') and (PasswordHash eq '{1}')", loginParams.Email, loginParams.Password)).FirstOrDefault();

                if (user == null)
                {
                    return 403;
                }

                user.PasswordHash = null;
                user.Id = 0;

                var response = this.LoginWithoutRedirect( (Guid)user.Guid, DateTime.Now.AddMinutes(15));

                user.Guid = null;
                response.Cookies.Add( new Nancy.Cookies.NancyCookie( "UserInfo", JsonConvert.SerializeObject( user )));

                return response;
            };

            Post["/membership/register"] = p =>
            {
                var registerParams = this.Bind<LoginParams>();

                dynamic user = this.SiteDatabase.Query("User",
                                string.Format("(Email eq '{0}')", registerParams.Email)).FirstOrDefault();

                if (user != null)
                {
                    return 403;
                }

                user = this.SiteDatabase.UpsertRecord("User", new
                {
                    Id = 0,
                    Guid = Guid.NewGuid(),
                    Email = registerParams.Email,
                    PasswordHash = registerParams.Password
                });

                return this.LoginWithoutRedirect((Guid)user.Guid, DateTime.Now.AddMinutes(15));
            };
        }
    }

    public class FormsUserMapper : IUserMapper
    {

        public Nancy.Security.IUserIdentity GetUserFromIdentifier(Guid identifier, NancyContext context)
        {
            var siteDb = context.Items["SiteDatabase"] as NancyBlackDatabase;
            dynamic user = siteDb.QueryAsJsonString("User",
                            string.Format("(Guid eq '{0}')", identifier)).FirstOrDefault();

            if (user == null)
            {
                return NancyBlackUser.Anonymous;
            }

            return JsonConvert.DeserializeObject<NancyBlackUser>( user );
        }
    }

    /// <summary>
    /// A very basic Nancy User
    /// </summary>
    public class NancyBlackUser : IUserIdentity
    {
        /// <summary>
        /// Guid
        /// </summary>
        public Guid Guid { get; set; }

        /// <summary>
        /// User Roles
        /// </summary>
        public IEnumerable<string> Claims
        {
            get;
            set;
        }

        /// <summary>
        /// Current User Name
        /// </summary>
        public string UserName
        {
            get;
            set;
        }

        /// <summary>
        /// Email
        /// </summary>
        public string Email
        {
            get
            {
                return this.UserName;
            }
            set
            {
                this.UserName = value;
            }
        }

        /// <summary>
        /// Anonymous User
        /// </summary>
        public static readonly NancyBlackUser Anonymous = new NancyBlackUser() { UserName = "Anonymous", Claims = new string[0] };
    }

}