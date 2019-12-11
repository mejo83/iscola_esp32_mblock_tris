var admin = {
    data: null,
    tpls: [],
    init: function () {
        $('#questions').html("");
        let tpls = $('#tpls>div');
        $.each(tpls, function (i, el) {
            let id = $(el).attr('id');
            if (id) {
                let html = $(el).html();
                admin.tpls[id] = html;
                $('#' + id).remove();
            }
        })
        $.getJSON('questions.json?a=' + Date.now(), function (resp) {
            admin.data = resp;
            admin.initForm();
        });
    },
    initForm: function () {
        let tplFree = admin.tpls['tpl_free'].toString();
        let tplStatic = admin.tpls['tpl_static'].toString();
        let pattern = new RegExp("\{id}", "g");

        for (let i in admin.data) {
            let question = admin.data[i];
            let tmp = "";
            if (question.type == 'free') {
                tmp = tplFree.toString().replace(pattern, question.id).replace('{text}', question.text).replace('{value}', question.right);
            } else {
                tmp = tplStatic.toString().replace(pattern, question.id).replace('{text}', question.text);
                for (let o = 0; o <= 5; o++) {
                    let tmpdata = {id: o, value: "", check: ""};
                    if (question.answers.hasOwnProperty(o)) {
                        tmpdata = {id: o, value: question.answers[o].text, check: ((question.right == o) ? "checked" : "")};
                    }
                    tmp = tmp.replace('{value_' + o + '}', tmpdata.value).replace('{answer_' + o + '_check}', tmpdata.check);
                }
            }
            $('#questions').append(tmp)

        }
        $('#questions').append(admin.tpls['tpl_actions']);


    },
    addNewFreeQuestion: function () {
        let tplFree = admin.tpls['tpl_free'].toString();
        let pattern = new RegExp("\{id}", "g");
        let tmp = tplFree.toString().replace(pattern, Date.now()).replace('{text}', '').replace('{value}', '');

        $('#questions').append(tmp);
        $("#actions_btn").appendTo('#questions');


    },
    addNewStaticQuestion: function () {
        let tplStatic = admin.tpls['tpl_static'].toString();
        let pattern = new RegExp("\{id}", "g");
        let tmp = tplStatic.toString().replace(pattern, Date.now()).replace('{text}', '');
        for (let o = 0; o <= 5; o++) {
            let tmpdata = {id: o, value: ""};
            tmp = tmp.replace('{value_' + o + '}', tmpdata.value);
        }

        $('#questions').append(tmp);
        $("#actions_btn").appendTo('#questions');



    },
    deleteQuestion: function (id) {
        if (!confirm("Sei sicuro di voler cancellare questa domanda?"))
            return;
        $('fieldset[data-id=' + id + ']').remove();
    },
    save: function () {
        if (!confirm("Sei sicuro di voler salvare queste domande?"))
            return;
        let questions = $('fieldset');
        var out = [];

        $.each(questions, function (i, el) {
            let type = $(el).data('type');
            let question = {id: i, type: type};
            question.text = $(el).find('.question_text').val();
            if (type == 'free') {
                question.right = $(el).find('.answer_right').val();
            } else {
                question.answers = [];
                let answers = $(el).find('.answer');
                $.each(answers, function (ii, ell) {
                    let text = $(ell).find('.answer_text').val();
                    let right = $(ell).find('.answer_right:checked').val();
                    if (right) {
                        question.right = right;
                    }
                    question.answers.push({id: ii, text: text});
                });
            }
            out.push(question);
        });

        admin.data = out;

        $.ajax({
            data: JSON.stringify(admin.data),
            type: 'POST',
            datatype: 'JSON',
            contentType: "application/json; charset=utf-8",
            url: "admin.php",
            success: function (data) {
                try {
                    data = JSON.parse(data);
                    if (data.error) {
                        alert('Si è verificato un errore: ' + data.text);
                    } else {
                        alert('Domande salvate con successo sul server');
                    }
                } catch (e) {

                }
            },
            error: function (e) {
                console.log(e.message);
            }
        });

        console.log(out);
    },
    download: function () {
        if (confirm("Ricorda che prima di scaricare devi salvare le precedenti modifiche, vuoi salvare ora?"))
            admin.save();
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(admin.data));
        var dlAnchorElem = document.getElementById('downloadAnchorElem');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "domande.json");
        dlAnchorElem.click();
    }

}
$(document).ready(function () {
    admin.init();
})