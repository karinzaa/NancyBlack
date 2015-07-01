﻿using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Nancy;
using RazorEngine;

namespace NantCom.NancyBlack.Modules.DatabaseSystem
{
    public class DataTypeAdminModule : BaseModule
    {
        public DataTypeAdminModule()
        {
            Get["/Admin/Tables"] = this.HandleStaticRequest("databasesystem-entities", () =>
            {
                return new
                {
                    Table = "DataType",
                    Layout = "_admin",
                };

            });

            // Administration pages for Table
            Get["/Admin/Tables/{table_name}"] = this.HandleTableRequests;

            Get["/tables/DataType"] = this.HandleListDataTypeRequest(() => this.SiteDatabase);
            Post["/tables/DataType/Scaffold"] = this.HandleScaffoldRequest(() => this.SiteDatabase);
            Post["/tables/DataType"] = this.HandleRegisterDataTypeRequest(() => this.SiteDatabase);
            Patch["/tables/DataType/{item_id}"] = this.HandleRegisterDataTypeRequest(() => this.SiteDatabase);
            Delete["/tables/DataType/{item_id}"] = this.HandleDeleteDataTypeRequest(() => this.SiteDatabase);
        }

        #region Tables API

        protected Func<dynamic, dynamic> HandleDeleteDataTypeRequest(Func<NancyBlackDatabase> dbGetter)
        {
            return this.HandleRequest((arg) =>
            {

                var id = arg.item_id == null ? 0 : (int?)arg.item_id;
                if (id == 0)
                {
                    throw new InvalidOperationException("Id supplied is not valid");
                }

                dbGetter().DataType.RemoveType(id.Value);

                return 204;

            });
        }

        protected Func<dynamic, dynamic> HandleListDataTypeRequest(Func<NancyBlackDatabase> dbGetter)
        {
            return this.HandleRequest((arg) =>
            {
                return from type in dbGetter().DataType.RegisteredTypes
                       where type.NormalizedName.StartsWith("__") == false
                       select type;
            });
        }
        
        protected Func<dynamic, dynamic> HandleScaffoldRequest(Func<NancyBlackDatabase> dbGetter)
        {
            return this.HandleRequest((arg) =>
            {
                var streamReader = new StreamReader(this.Request.Body);
                var json = streamReader.ReadToEnd();

                return dbGetter().DataType.Scaffold(json);
            });
        }

        protected Func<dynamic, dynamic> HandleRegisterDataTypeRequest(Func<NancyBlackDatabase> dbGetter)
        {
            return this.HandleRequest((arg) =>
            {
                var dataType = (JObject)arg.body;
                return dbGetter().DataType.Register(dataType.ToObject<DataType>());
            });
        }

        #endregion
        
        protected dynamic HandleTableRequests(dynamic arg)
        {
            var table_name = (string)arg.table_name;
            var replace = this.Context.Request.Query.regenerate == "true";

            var type = this.SiteDatabase.DataType.FromName(table_name);
            if (type == null)
            {
                return 404;
            }

            this.GenerateAdminView(type.OriginalName, replace);

            if (replace == true)
            {
                // redirect to remove query string and avoid re-generating again
                return this.Response.AsRedirect(this.Context.Request.Path);
            }

            return View["Admin/" + arg.table_name, this.GetModel(type)];
        }


        public class ViewModel
        {
            public DataType DataType { get; set; }

            public string Layout { get; set; }
        }

        /// <summary>
        /// Generates the view.
        /// </summary>
        /// <param name="db">The database.</param>
        /// <param name="templatePath">The target template path.</param>
        /// <param name="table_name">The table_name.</param>
        /// <param name="replace">if set to <c>true</c>, view will be replaced.</param>
        /// <exception cref="System.InvalidOperationException">Entity: + table_name +  does not exists, Insert some sample data before running this page.</exception>
        protected void GenerateView(NancyBlackDatabase db,
                                    string templatePath,
                                    string table_name,
                                    string layout,
                                    bool replace = false,
                                    string fileName = null)
        {
            if (fileName == null)
            {
                fileName = table_name;
            }

            var templateFile = Path.Combine(
                                    templatePath,
                                    fileName + ".cshtml");


            if (File.Exists(templateFile) && replace == false)
            {
                return;
            }

            var type = db.DataType.FromName(table_name);
            if (type == null)
            {
                throw new InvalidOperationException("Entity:" + table_name + " does not exists, Insert some sample data before running this page.");
            }

            var template = File.ReadAllText(Path.Combine(this.RootPath, "Modules", "DatabaseSystem", "Views", "_backendtemplate.cshtml"));
            var code = Razor.Parse<ViewModel>(template, new ViewModel()
            {
                DataType = type,
                Layout = layout
            }, null);

            Directory.CreateDirectory(templatePath);
            File.WriteAllText(templateFile, code);
        }

        /// <summary>
        /// Generates the admin view for current site
        /// </summary>
        /// <param name="table_name">The table_name.</param>
        /// <param name="replace">if set to <c>true</c> [replace].</param>
        /// <exception cref="System.InvalidOperationException">Entity: + table_name +  does not exists, Insert some sample data before running this page.</exception>
        protected void GenerateAdminView(string table_name, bool replace = false)
        {
            var templatePath = Path.Combine(this.RootPath, "Site", "Views", "Admin");

            this.GenerateView(this.SiteDatabase, templatePath, table_name, "_admin.cshtml", replace, table_name);
        }

    }
}